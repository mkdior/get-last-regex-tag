import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
		// Setup all variables needed for our requests to github.
    const gitToken: string = core.getInput('github-token')
		const regexp: string = core.getInput('tag-regexp')
		const git = github.getOctokit(gitToken)
		const { owner, repo } = github.context.repo

	
		try {
			var regex = new RegExp(regexp);

			git.request('GET  /repos/{owner}/{repo}/tags', {owner, repo})

		} catch(error) {
			var baseError = 'Something went wrong while trying to parse the regular expression.'
			if (error instanceof Error) {
				core.setFailed(baseError + ' Are you sure it\'s a valid one? \n'+ error.message)
			} else {
				core.setFailed(baseError)
			}
		}


  } catch (error) {
    if (error instanceof Error) {
			core.setFailed(error.message);
		} else {
			core.setFailed('Something went wrong.')
		}
  }
}

run()
