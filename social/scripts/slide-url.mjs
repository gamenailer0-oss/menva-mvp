// Builds the template URL for one slide. The n8n workflow does exactly the same
// (see the "Build render requests" node), so previews match what gets posted.
export function slideUrl(base, slide) {
  const d = Buffer.from(JSON.stringify(slide), 'utf8').toString('base64url');
  return `${base}/social/templates/post.html?d=${d}`;
}
