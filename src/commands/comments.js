import path from 'path';
import { LinearAuth } from '../auth.js';
import { LinearAPI } from '../linear-api.js';
import { WorkspaceManager } from '../workspace.js';

function buildMarkdownLink(fileName, url) {
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif'];
  const ext = path.extname(fileName).toLowerCase();
  if (imageExts.includes(ext)) {
    return `![${fileName}](${url})`;
  }
  return `[${fileName}](${url})`;
}

async function ensureAuthenticated(workspace) {
  const workspaceManager = new WorkspaceManager();
  const resolvedWorkspace = await workspaceManager.resolveWorkspace(workspace);
  const auth = new LinearAuth(resolvedWorkspace);
  const token = await auth.getToken();
  
  if (!token) {
    console.error(`❌ Not authenticated for workspace "${resolvedWorkspace}". Please run "lin login <api-token> --workspace=${resolvedWorkspace}" first.`);
    process.exit(1);
  }
  
  const isValid = await auth.validateToken(token);
  if (!isValid) {
    console.error(`❌ Invalid or expired token for workspace "${resolvedWorkspace}". Please run "lin login <api-token> --workspace=${resolvedWorkspace}" again.`);
    process.exit(1);
  }
  
  return { token, workspace: resolvedWorkspace };
}

export async function viewCommentsCommand(issueIdentifier, options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);
    
    const searchResult = await api.getIssueByIdentifier(issueIdentifier);
    
    if (!searchResult.issues.nodes.length) {
      console.error(`❌ Issue ${issueIdentifier} not found.`);
      process.exit(1);
    }
    
    const issue = searchResult.issues.nodes[0];
    const result = await api.getIssueComments(issue.id);
    
    const comments = result.issue.comments.nodes;
    
    console.log(`\n💬 Comments for ${result.issue.identifier} [${workspace}]:`);
    
    if (!comments.length) {
      console.log('No comments found.');
      return;
    }
    
    comments.forEach((comment, index) => {
      console.log(`\n--- Comment ${index + 1} ---`);
      if (options.showIds) {
        console.log(`ID: ${comment.id}`);
      }
      console.log(`Author: ${comment.user.name} (${comment.user.email})`);
      console.log(`Created: ${new Date(comment.createdAt).toLocaleString()}`);
      if (comment.updatedAt !== comment.createdAt) {
        console.log(`Updated: ${new Date(comment.updatedAt).toLocaleString()}`);
      }
      console.log(`\n${comment.body}`);
    });
    
  } catch (error) {
    console.error('❌ Error fetching comments:', error.message);
    process.exit(1);
  }
}

export async function addCommentCommand(issueIdentifier, commentBody, options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);
    
    const searchResult = await api.getIssueByIdentifier(issueIdentifier);
    
    if (!searchResult.issues.nodes.length) {
      console.error(`❌ Issue ${issueIdentifier} not found.`);
      process.exit(1);
    }
    
    const issue = searchResult.issues.nodes[0];

    // Handle file attachment
    if (options.attachment) {
      try {
        console.log(`📎 Uploading attachment: ${options.attachment}`);
        const assetUrl = await api.uploadFile(options.attachment);
        const fileName = path.basename(options.attachment);
        console.log('✅ File uploaded successfully!');

        console.log(`📎 Creating attachment: ${fileName}`);
        const attachmentResult = await api.createAttachment(issue.id, assetUrl, fileName, {
          subtitle: 'Uploaded via Linear CLI'
        });

        if (attachmentResult.attachmentCreate.success) {
          console.log('✅ Attachment created successfully!');
        } else {
          console.error('❌ Failed to create attachment in Linear');
        }

        // Append markdown link to comment body
        const markdownLink = buildMarkdownLink(fileName, assetUrl);
        commentBody = `${commentBody}\n\n${markdownLink}`;
      } catch (error) {
        console.error(`❌ Failed to upload attachment: ${error.message}`);
        process.exit(1);
      }
    }

    console.log(`Adding comment to ${issue.identifier} in workspace ${workspace}...`);
    const result = await api.createComment(issue.id, commentBody);
    
    if (result.commentCreate.success) {
      const comment = result.commentCreate.comment;
      console.log('✅ Comment added successfully!');
      console.log(`ID: ${comment.id}`);
      console.log(`Author: ${comment.user.name} (${comment.user.email})`);
      console.log(`Created: ${new Date(comment.createdAt).toLocaleString()}`);
      console.log(`\n${comment.body}`);
    } else {
      console.error('❌ Failed to add comment.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error adding comment:', error.message);
    process.exit(1);
  }
}

export async function editCommentCommand(commentId, commentBody, options = {}) {
  try {
    const { token, workspace } = await ensureAuthenticated(options.workspace);
    const api = new LinearAPI(token);

    // Handle file attachment
    if (options.attachment) {
      try {
        console.log(`📎 Uploading attachment: ${options.attachment}`);
        const assetUrl = await api.uploadFile(options.attachment);
        const fileName = path.basename(options.attachment);
        console.log('✅ File uploaded successfully!');

        // Note: createAttachment requires an issue ID; we don't have one for comment edit.
        // The file is still uploaded and linked inline in the comment body.
        const markdownLink = buildMarkdownLink(fileName, assetUrl);
        commentBody = `${commentBody}\n\n${markdownLink}`;
      } catch (error) {
        console.error(`❌ Failed to upload attachment: ${error.message}`);
        process.exit(1);
      }
    }

    console.log(`Updating comment ${commentId} in workspace ${workspace}...`);
    const result = await api.updateComment(commentId, commentBody);
    
    if (result.commentUpdate.success) {
      const comment = result.commentUpdate.comment;
      console.log('✅ Comment updated successfully!');
      console.log(`ID: ${comment.id}`);
      console.log(`Author: ${comment.user.name} (${comment.user.email})`);
      console.log(`Updated: ${new Date(comment.updatedAt).toLocaleString()}`);
      console.log(`\n${comment.body}`);
    } else {
      console.error('❌ Failed to update comment.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error updating comment:', error.message);
    process.exit(1);
  }
}