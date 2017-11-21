resource "aws_cloudwatch_event_rule" "main" {
  name                = "${var.name}"
  description         = "${var.description}"
  schedule_expression = "${var.schedule_expression}"
}

resource "aws_lambda_permission" "main" {
  principal     = "events.amazonaws.com"
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = "${var.function_name}"
  source_arn    = "${aws_cloudwatch_event_rule.main.arn}"
}

resource "aws_cloudwatch_event_target" "main" {
  rule      = "${aws_cloudwatch_event_rule.main.name}"
  arn       = "${var.function_arn}"
}
