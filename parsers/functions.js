const path = require('path');
const fs = require('fs');
const options = require('../options');

const http = require('./function.http');
const schedule = require('./function.schedule');

let data_api = '';

module.exports = (serverless) => {
    if (!serverless.functions) return;

    data_api = '';

    let hasApiGateway = false;
    const name = serverless.service;

    Object.keys(serverless.functions).forEach((key) => {
        const fct = serverless.functions[key];

        const handler = path.basename(fct.handler);

        let data = `
data "archive_file" "${key}" {
  type = "zip"
  output_path = "\${path.module}/${key}.zip"
  source {
    filename = "index.js"
    content = "\${file("\${path.module}/${key}.js")}"
  }
}

resource "aws_lambda_function" "${key}" {
  function_name = "\${var.service}-${key}"
  filename = "\${data.archive_file.${key}.output_path}"
  source_code_hash = "\${data.archive_file.${key}.output_base64sha256}"
  #role = "\${aws_iam_role.lambda.arn}"
  role = "\${var.lambda_role_arn}"
  handler = "${handler}"
  runtime = "nodejs6.10"
  memory_size = ${fct.memorySize || 1536}
  timeout = ${fct.timeout || 120}
  publish = true
  tags = ${JSON.stringify(fct.tags || {}, null, 2).replace(/"(.*?)":/g, '$1 = ')}
}
`;

        if (fct.events) {
            let nestedRoutes = {
                key: 'root',
                path_part: '',
                methods:{},
                children:{}
            };
            fct.events.forEach((event, idx) => {
                if (event.schedule) {
                    data += `
module "${key}_${idx}" {
  source              = "github.com/willfarrell/serverless-terraform//modules/function-schedule"
  name                = "\${var.service}-${key}-${idx}"
  description         = "${event.schedule.description || ''}"
  schedule_expression = "${event.schedule.rate || ''}"
  function_name       = "\${aws_lambda_function.${key}.function_name}"
  function_arn        = "\${aws_lambda_function.${key}.arn}"
}
`;
                } else if (event.http) {
                    if (!hasApiGateway) {
                        fs.writeFileSync(`${options.get('output')}/api-gateway.tf`, apiGateway(name, event));
                        hasApiGateway = true;
                    }

                    event.http.lambda_function = key;
                    if (event.http.path === '/') {
                        // API root
                        nestedRoutes.methods[event.http.method] = event.http;
                    } else {
                        nestedRoutes.children = recursePaths(nestedRoutes.key, nestedRoutes.children, event.http.path.split('/'), event.http);
                    }
                }
            });

            //console.log(JSON.stringify(nestedRoutes, null, 2));

            data += apiGatewayRoutes(name, nestedRoutes);
        }

        fs.writeFileSync(`${options.get('output')}/${key}.tf`, data);
    });

};

const apiGateway = (name, event) => {
    return `
resource "aws_api_gateway_rest_api" "${name}" {
  name        = "\${var.env}-\${var.service}"
  description = "${event.description || ''}"
}

output "api_gateway_id" {
  value = "\${aws_api_gateway_rest_api.${name}.id}"
}

output "api_gateway_arn" {
  value = "\${aws_api_gateway_rest_api.${name}.arn}"
}
`;
};

const recursePaths = (pkey, tree, path, event) => {
    let current = '';
    while(current === '') {
        if (!path.length) {
            return tree;
        }
        current = path.shift();
    }

    if (!tree[current]) {
        tree[current] = {
            key: pkey+'-'+current.replace(/[\{\}]/g, '_'),
            path_part: current,
            methods:{},
            children:{}
        };
    }

    if (!path.length) {
        if (event.method) tree[current].methods[event.method.toUpperCase()] = event;
    }

    tree[current].children = recursePaths(tree[current].key, tree[current].children, path, event);

    return tree;
};

const apiGatewayRoutes = (name, nestedRoutes) => {
    const parent_id = nestedRoutes.key === 'root'
        ? `\${aws_api_gateway_rest_api.${name}.root_resource_id}`
        : `\${aws_api_gateway_resource.${nestedRoutes.key}.id}`;

    let data = '';

    Object.keys(nestedRoutes.methods).forEach((method) => {
        const resource_id = parent_id;
        const event = nestedRoutes.methods[method];

        const authorizer_bool = !!event.authorizer ? 1 : 0;
        if (!authorizer_bool) {
            event.authorizer = {
                name: '',
                uri: '',
                resultTtlInSeconds: 0
            };
        } else {
            event.authorizer.uri = `\${aws_lambda_function.${event.authorizer.name}.arn}`;
        }

        data += `
module "${nestedRoutes.key}-${event.method.toLowerCase()}" {
  source          = "github.com/willfarrell/serverless-terraform//modules/function-http"
  aws_account_id  = "\${var.aws_account_id}"
  aws_region      = "\${var.aws_region}"
  name            = "${nestedRoutes.key}-${event.method.toLowerCase()}"
  rest_api_id     = "\${aws_api_gateway_rest_api.${name}.id}"
  resource_id     = "${resource_id}"
  resource_path   = "${event.path}"

  http_method     = "${event.method.toUpperCase()}"
  path_part       = "${nestedRoutes.path_part}"

  function_name   = "\${aws_lambda_function.${event.lambda_function}.function_name}"
  function_arn    = "\${aws_lambda_function.${event.lambda_function}.arn}"

  authorizer_bool = "${authorizer_bool}"
  authorizer_name = "${event.authorizer.name}"
  authorizer_uri  = "${event.authorizer.uri}"
  authorizer_result_ttl_in_seconds = "${event.authorizer.resultTtlInSeconds}"
}
`;

        if (event.cors) {
            data += `
module "${nestedRoutes.key}-${event.method.toLowerCase()}-cors" {
  source        = "github.com/willfarrell/serverless-terraform//modules/function-http-cors"
  rest_api_id   = "\${aws_api_gateway_rest_api.${name}.id}"
  resource_id   = "${resource_id}"
}
`;
        }
    });

    Object.keys(nestedRoutes.children).forEach((key) => {
        console.log('resource', nestedRoutes.children[key].key, parent_id);
        data += `
resource "aws_api_gateway_resource" "${nestedRoutes.children[key].key}" {
  rest_api_id = "\${aws_api_gateway_rest_api.${name}.id}"
  parent_id   = "${parent_id}"
  path_part   = "${key}"
}
`;

        data += apiGatewayRoutes(name, nestedRoutes.children[key]);
    });

    return data;
};
