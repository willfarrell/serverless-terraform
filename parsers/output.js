const fs = require('fs');
const options = require('../options');

module.exports = (serverless) => {
    let data = ``;

    if (serverless.service) {
        data += `
output "name" {
  value = "${serverless.service}"
}
`;
    }

    fs.writeFileSync(`${options.get('output')}/output.tf`, data);
};
