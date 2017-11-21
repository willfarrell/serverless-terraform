variable "aws_account_id" {
  type        = "string"
  description = "Serverless AWS Account Id"
}

variable "aws_region" {
  type        = "string"
  default     = "us-east-1"
  description = "Serverless AWS Region (us-east-1)"
}

variable "rest_api_id" {
  type        = "string"
  description = "api_gateway_rest_api id"
}

variable "parent_id" {
  type        = "string"
  description = "api_gateway_rest_api root_resource_id"
}

variable "path_part" {
  type        = "string"
  description = "Request path"
}

variable "http_method" {
  type        = "string"
  default     = "ANY"
  description = "Request method in caps."
}

variable "function_name" {
  type        = "string"
  description = "Lambda function name"
}

variable "function_arn" {
  type        = "string"
  description = "Lambda function arn"
}

variable "authorizer_bool" {
  type        = "string"
  default     = "0"
  description = "Include Event authorizer bool"
}

variable "authorizer_name" {
  type        = "string"
  description = "Event authorizer name (authorizer_uri)"
}

variable "authorizer_uri" {
  type        = "string"
  description = "Event authorizer arn (authorizer_uri)"
}

variable "authorizer_result_ttl_in_seconds" {
  type        = "string"
  default     = 300
  description = "Event authorizer_resultTtlInSeconds (authorizer_result_ttl_in_seconds)"
}
