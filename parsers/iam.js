const fs = require('fs');
const options = require('../options');

module.exports = (serverless) => {
    if (!serverless.provider || !serverless.provider.iamRoleStatements) return;

    const roles = serverless.provider.iamRoleStatements;

    // opt:, self:,

    const data = `
resource "aws_iam_role" "lambda" {
  name = "\${var.env}-\${var.service}-role"
  path = "/"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": ${JSON.stringify(roles, null, 2)}
}
EOF
}
`;
    fs.writeFileSync(`${options.get('output')}/iam.tfexample`, data);
};

// const replacer = function(tpl, data) {
//     // TODO inject reduce - or find polyfill
//     return tpl.replace(/\${([^}]+)?}/g, function($1, $2) { return data[$2]; });
// };
