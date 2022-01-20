import * as core from '@actions/core'
import * as github from '@actions/github'

async function run(): Promise<void> {
  try {
    // Set up Github tokens
    const gitToken: string = core.getInput('github-token')
    const git = github.getOctokit(gitToken)

    // Set up tag target.
    const regexp: string = core.getInput('tag-target')
    if (regexp !== 'staging' && regexp !== 'production') {
      return core.setFailed(
        'Ensure that tag-target is set to either staging or production.'
      )
    }

    // Get source context
    const {owner, repo} = github.context.repo

    const rexp =
      regexp === 'staging'
        ? new RegExp(/^v[0-9]+\.[0-9]+\.[0-9]+-rc(\.[0-9]+)?$/)
        : new RegExp(/^v[0-9]+\.[0-9]+\.[0-9]+$/)

    // Get all our releases
    const baseError =
      'Something went wrong while trying to retrieve your releases.'
    const res = await git.request('GET /repos/{owner}/{repo}/releases', {
      owner,
      repo
    })

    // Check if our request was a success
    if (res.status !== 200) {
      return core.setFailed(
        `${baseError} Got status ${res.status} but expected status 200.`
      )
    }

    if (res.data.length === 0) {
      // In reality you don't want to error out here, just let the run finish and present
      // our default version value. Handle this version tag with special care on repo-side.
      core.setOutput('tag-name', 'v0.0.0')
      core.setOutput('tag-sha1', '')
      return
    }

    // Extract all releases
    type tagPair = {
      tagName: string
      tagSha: string
    }

    const releaseTagNames: tagPair[] = []
    for (const value of res.data) {
      releaseTagNames.push({
        tagName: value.tag_name,
        tagSha: value.target_commitish
      })
    }

    // Since our tags are ordered, simply loop and exit at first match
    let targetTag: tagPair = {tagName: '', tagSha: ''}
    for (const val of releaseTagNames) {
      const matchTotal = rexp.exec(val.tagName)
      if (!matchTotal || matchTotal.length === 0) {
        continue
      } else {
        // If we find our tag pattern, break on first match
        targetTag = val
        break
      }
    }

    // At this point we have either a match or ""
    if (targetTag.tagName === '') {
      targetTag.tagName = 'v0.0.0'
    }

    core.setOutput('tag-name', targetTag.tagName)
    core.setOutput('tag-sha1', targetTag.tagSha)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('Something went wrong.')
    }
  }
}

run()
