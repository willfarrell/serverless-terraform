const fs = require('fs');
const options = require('../options');

module.exports = (serverless) => {
    let data = `
variable "env" {
  type        = "string"
  default     = "unknown"
  description = "Environment"
}

variable "aws_region" {
  type        = "string"
  default     = "${serverless.provider.region || 'us-east-1'}"
  description = "Serverless AWS Region (us-east-1)"
}

variable "aws_account_id" {
  type        = "string"
  description = "Serverless AWS Account ID"
}

variable "lambda_role_arn" {
  type        = "string"
  default     = ""
  description = "AWS ARN for lambda role"
}
`;

    if (serverless.service) {
        data += `
variable "service" {
  type        = "string"
  default     = "${serverless.service}"
  description = "Serverless service name"
}
`;
    }

    fs.writeFileSync(`${options.get('output')}/variables.tf`, data);
};
