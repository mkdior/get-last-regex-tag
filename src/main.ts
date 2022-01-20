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
    const baseRlsError =
      'Something went wrong while trying to retrieve your releases.'
    const rlsRes = await git.request('GET /repos/{owner}/{repo}/releases', {
      owner,
      repo
    })

    // Check if our request was a success
    if (rlsRes.status !== 200) {
      return core.setFailed(
        `${baseRlsError} Got status ${rlsRes.status} but expected status 200.`
      )
    }

    if (rlsRes.data.length === 0) {
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
    for (const value of rlsRes.data) {
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

    // Time to get the tag
    // @TODO -->>> Fix the code so that we simply rely on this step for
    // tag grabbing.
    const baseTagError =
      'Something went wrong while trying to retrieve your Tags.'
    const tagRes = await git.request('GET /repos/{owner}/{repo}/tags', {
      owner,
      repo
    })

    // Check if our request was a success
    if (tagRes.status !== 200) {
      return core.setFailed(
        `${baseTagError} Got status ${tagRes.status} but expected status 200.`
      )
    }

    if (tagRes.data.length === 0) {
      return core.setFailed(`${baseTagError} There were no tags!`)
    }

    for (const val of tagRes.data) {
      if (val.name === targetTag.tagName) {
        targetTag.tagSha = val.commit.sha
        break
      }
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
