import type { ForumPostWithAuthor } from "@/lib/types";

export interface ForumThreadNode {
  post: ForumPostWithAuthor;
  children: ForumThreadNode[];
}

/** Build a nested reply tree from a flat list (excludes the thread root post). */
export function buildForumReplyTree(
  rootPostId: string,
  replies: ForumPostWithAuthor[]
): ForumThreadNode[] {
  const nodes = new Map<string, ForumThreadNode>(
    replies.map((post) => [post.id, { post, children: [] }])
  );
  const roots: ForumThreadNode[] = [];

  for (const reply of replies) {
    const node = nodes.get(reply.id);
    if (!node) continue;

    if (reply.parent_id === rootPostId) {
      roots.push(node);
      continue;
    }

    const parent = reply.parent_id ? nodes.get(reply.parent_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortForumThreadNodes(roots);
  return roots;
}

function sortForumThreadNodes(nodes: ForumThreadNode[]) {
  nodes.sort(
    (a, b) =>
      new Date(a.post.created_at).getTime() -
      new Date(b.post.created_at).getTime()
  );
  for (const node of nodes) {
    sortForumThreadNodes(node.children);
  }
}

export function countForumThreadReplies(nodes: ForumThreadNode[]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1 + countForumThreadReplies(node.children);
  }
  return total;
}
