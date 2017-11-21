variable "function_name" {
  type        = "string"
  description = "Lambda function name"
}

variable "function_arn" {
  type        = "string"
  description = "Lambda function arn"
}

variable "name" {
  type        = "string"
  description = "{service}-{event}-{idx}"
}

variable "description" {
  type        = "string"
  default     = ""
  description = "Schedule description"
}

variable "schedule_expression" {
  type        = "string"
  description = "schedule_expression"
}
