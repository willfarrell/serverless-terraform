module.exports = (key, idx, name, event) => {

    let authorizer = '';
    let cors = '';
    if (event.authorizer) {
        authorizer = `
resource "aws_api_gateway_authorizer" "${key+'-'+idx}" {
  name                             = "${key+'-'+idx}"
  rest_api_id                      = "\${aws_api_gateway_rest_api.${name}.id}"
  authorizer_uri                   = "\${aws_lambda_function.${event.authorizer.name}.function_name}"
  authorizer_result_ttl_in_seconds = "${event.authorizer.resultTtlInSeconds || 300}"
}
`
    }

    if (event.cors) {
        cors = `
module "${key+'-'+idx}_cors" {
  source = "github.com/carrot/terraform-api-gateway-cors-module"
  resource_name = "${key+'-'+idx}"
  resource_id = "\${aws_api_gateway_resource.${key+'-'+idx}.id}"
  rest_api_id = "\${aws_api_gateway_rest_api.${name}.id}"
}
`;
    }

    return `
resource "aws_api_gateway_resource" "${key+'-'+idx}" {
  rest_api_id = "\${aws_api_gateway_rest_api.${name}.id}"
  parent_id   = "\${aws_api_gateway_rest_api.${name}.root_resource_id}"
  path_part   = "${event.path}"
}

resource "aws_api_gateway_method" "${key+'-'+idx}" {
  rest_api_id   = "\${aws_api_gateway_rest_api.${name}.id}"
  resource_id   = "\${aws_api_gateway_resource.${key+'-'+idx}.id}"
  http_method   = "${event.method.toUpperCase() || 'ANY'}"
  authorization = "${authorizer ? 'CUSTOM' : 'NONE'}"
  ${authorizer ? `authorizer_id = "\${aws_api_gateway_authorizer.${key+'-'+idx}.id}"` : ''}
}

resource "aws_api_gateway_integration" "${key+'-'+idx}" {
  rest_api_id   = "\${aws_api_gateway_rest_api.${name}.id}"
  resource_id   = "\${aws_api_gateway_resource.${key+'-'+idx}.id}"
  http_method   = "\${aws_api_gateway_method.${key+'-'+idx}.http_method}"
  type          = "AWS_PROXY"
  uri           = "arn:aws:apigateway:\${var.aws_region}:lambda:path/2015-03-31/functions/\${aws_lambda_function.${key}.arn}/invocations"
}

resource "aws_lambda_permission" "${key+'-'+idx}" {
  principal     = "apigateway.amazonaws.com"
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "\${aws_lambda_function.${key}.function_name}"
}
${authorizer}
${cors}
`;
};
