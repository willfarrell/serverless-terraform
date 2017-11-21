module.exports = (key, idx, name, event) => {
    return `
resource "aws_cloudwatch_event_rule" "${key+'-'+idx}" {
  name                = "\${var.service}-${key+'-'+idx}"
  description         = "${event.description || ''}"
  schedule_expression = "${event.rate || ''}"
}

resource "aws_lambda_permission" "${key+'-'+idx}" {
  principal     = "events.amazonaws.com"
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = "\${aws_lambda_function.${key}.function_name}"
  source_arn    = "\${aws_cloudwatch_event_rule.${key+'-'+idx}.arn}"
}

resource "aws_cloudwatch_event_target" "${key+'-'+idx}" {
  rule      = "\${aws_cloudwatch_event_rule.${key+'-'+idx}.name}"
  arn       = "\${aws_lambda_function.${key}.arn}"
}
`;
};
