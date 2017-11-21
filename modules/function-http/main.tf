
resource "aws_api_gateway_resource" "main" {
  rest_api_id = "${var.rest_api_id}"
  parent_id   = "${var.parent_id}"
  path_part   = "${var.path_part}"
}

resource "aws_api_gateway_method" "main" {
  count         = "${1-var.authorizer_bool}"
  rest_api_id   = "${var.rest_api_id}"
  resource_id   = "${aws_api_gateway_resource.main.id}"
  http_method   = "${var.http_method}"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "main_auth" {
  count         = "${var.authorizer_bool}"
  rest_api_id   = "${var.rest_api_id}"
  resource_id   = "${aws_api_gateway_resource.main.id}"
  http_method   = "${var.http_method}"
  authorization = "CUSTOM"
  authorizer_id = "${aws_api_gateway_authorizer.main.id}"
}

resource "aws_api_gateway_integration" "main" {
  rest_api_id   = "${var.rest_api_id}"
  resource_id   = "${aws_api_gateway_resource.main.id}"
  http_method   = "${var.http_method}"
  type          = "AWS_PROXY"
  uri           = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.${key}.arn}/invocations"
}

resource "aws_lambda_permission" "main" {
  principal     = "apigateway.amazonaws.com"
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.${key}.function_name}"
}

module "cors" {
  count         = "${var.cors_bool}"
  source        = "github.com/carrot/terraform-api-gateway-cors-module"
  resource_name = "cors"
  rest_api_id   = "${aws_api_gateway_rest_api.${name}.id}"
  resource_id   = "${aws_api_gateway_resource.main.id}"
}

resource "aws_api_gateway_authorizer" "main" {
  count                            = "${var.authorizer_bool}"
  name                             = "${var.name}"
  rest_api_id                      = "${var.rest_api_id}"
  authorizer_uri                   = "${var.authorizer_uri}"
  authorizer_result_ttl_in_seconds = "${var.authorizer_result_ttl_in_seconds}"
}

