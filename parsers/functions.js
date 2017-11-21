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
                    data += http(key, idx, name, event.http);

                }
                if (event.schedule) data += schedule(key, idx, name, event.schedule);
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
