const path = require('path');
const fs = require('fs');
const options = require('../options');

const http = require('./function.http');
const schedule = require('./function.schedule');

module.exports = (serverless) => {
    if (!serverless.functions) return;

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
            fct.events.forEach((event, idx) => {
                if (event.http) {
                    if (!hasApiGateway) {
                        fs.writeFileSync(`${options.get('output')}/api-gateway.tf`, apiGateway(name, event));
                        hasApiGateway = true;
                    }

                    const authorizer_bool = !!event.http.authorizer ? 1 : 0;
                    if (!authorizer_bool) {
                        event.http.authorizer = {};
                    }

                    data += `
module "${key}_http_${idx}" {
  source = "github.com/willfarrell/serverless-terraform//modules/function-http"
  aws_region = "\${var.aws_region}"
  rest_api_id = "\${aws_api_gateway_rest_api.${name}.id}"
  parent_id = "\${aws_api_gateway_rest_api.${name}.root_resource_id}"
  
  http_method   = "${event.http.method.toUpperCase()}"
  path_part     = "${event.http.path}"
  
  authorizer_bool = "${authorizer_bool}"
  authorizer_uri = "${event.http.authorizer.name}"
  authorizer_result_ttl_in_seconds = "${event.http.authorizer.resultTtlInSeconds}"
}
`;

                } else if (event.schedule) {
                    data += `
module "${key}_http_${idx}" {
  source              = "github.com/willfarrell/serverless-terraform//modules/function-schedule"
  name                = "\${var.service}-${key}-${idx}"
  description         = "${event.schedule.description || ''}"
  schedule_expression = "${event.schedule.rate || ''}"
  function_name       = "\${aws_lambda_function.${key}.function_name}"
  function_arn        = "\${aws_lambda_function.${key}.arn}"
}
`;
                }
            });
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
