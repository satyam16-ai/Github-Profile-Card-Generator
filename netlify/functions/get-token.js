// filepath: /home/satyam/Desktop/Projects/github-2024-recap/netlify/functions/get-token.js
exports.handler = async function(event, context) {
    return {
        statusCode: 200,
        body: JSON.stringify({ token: process.env.GITHUB_TOKEN })
    };
};