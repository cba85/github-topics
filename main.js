import { Octokit } from "@octokit/rest";

// CLI

if (process.argv.length != 3) {
  console.error("Please enter a repository name");
  process.exit(1);
}

const repositoryName = process.argv[2];

// Check repository name validity

const githubRepositoryRegex = /[a-z0-9.\_\-]+\/[a-z0-9.\_\-]+/g;

const isRepositoryNameValid = githubRepositoryRegex.test(repositoryName);

if (!isRepositoryNameValid) {
  console.error("Please enter a valid repository name (username/name)");
  process.exit(1);
}

console.log(`> Update ${repositoryName} topics`);

// Github API

const octokit = new Octokit({ auth: process.env.GITHUB_AUTH_TOKEN });

// Get repository and its topics

let repository;

try {
  const response = await octokit.rest.repos.get(`GET /repos/${repositoryName}`);
  repository = response.data;
} catch (error) {
  console.error(error.response.data.message);
  process.exit(1);
}

const topics = repository.topics;

// Get package.json file content

let packageJson;

try {
  const response = await octokit.request(`GET /repos/${repositoryName}/contents/package.json`);
  packageJson = response.data;
} catch (error) {
  console.error(error.response.data.message);
  process.exit(1);
}

const bufferObj = Buffer.from(packageJson.content, "base64");
const packageContent = bufferObj.toString("utf8");

const json = JSON.parse(packageContent);

// Get package.json dependencies

if (!json.dependencies) {
  console.error("No dependencies in package.json file");
  process.exit(1);
}

const packageDependencies = Object.keys(json.dependencies);

// Combinate Github repository topics and package.json dependencies

let dependencies = Array.from(new Set([...packageDependencies, ...topics]));

// Sanitize dependencies

const githubTopicsRegex1 = /[@]+/g;
const githubTopicsRegex2 = /[\/]+/g;

for (let [index, dependency] of dependencies.entries()) {
  dependency = dependency.replace(githubTopicsRegex1, "");
  dependency = dependency.replace(githubTopicsRegex2, "-");
  dependencies[index] = dependency;
}

dependencies = Array.from(new Set([...dependencies]));

// Update repository topics on Github

try {
  await octokit.request(`PUT /repos/${repositoryName}/topics`, {
    names: dependencies,
  });
} catch (error) {
  console.log(error);
  process.exit(1);
}

console.log(`> Found ${JSON.stringify(dependencies)}`);
console.log(`> Topics have been updated on Github repository`);
