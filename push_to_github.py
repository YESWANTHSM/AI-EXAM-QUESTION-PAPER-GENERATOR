"""
Direct GitHub Uploader for AI-EXAM-QUESTION-PAPER-GENERATOR
Uses GitHub REST API (Tree & Commit API) to upload all files atomically in a single commit.
Requires a GitHub Personal Access Token (PAT).
"""
import os
import sys
import base64
import json
import urllib.request
import urllib.error

REPO_OWNER = "YESWANTHSM"
REPO_NAME = "AI-EXAM-QUESTION-PAPER-GENERATOR"
BRANCH = "main"

EXCLUDE_DIRS = {"node_modules", "__pycache__", "dist", ".git", ".venv", "venv", ".idea", ".vscode"}
EXCLUDE_EXTS = {".pyc", ".pyo", ".log"}

def get_headers(token):
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Antigravity-Uploader",
        "Content-Type": "application/json"
    }

def api_request(url, token, data=None, method="GET"):
    headers = get_headers(token)
    req_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def upload_all(token):
    print(f"Connecting to GitHub repository: {REPO_OWNER}/{REPO_NAME}...")
    
    # 1. Get reference to current branch head
    ref_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/refs/heads/{BRANCH}"
    try:
        ref_data = api_request(ref_url, token)
        parent_commit_sha = ref_data["object"]["sha"]
        print(f"Current HEAD commit: {parent_commit_sha}")
    except urllib.error.HTTPError as e:
        print(f"Error getting branch ref: {e}")
        parent_commit_sha = None

    # 2. Collect all files to upload
    tree_items = []
    root_dir = os.path.abspath(".")
    print("Collecting files...")
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            if any(f.endswith(ext) for ext in EXCLUDE_EXTS):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, root_dir).replace("\\", "/")
            
            # Read file content
            try:
                with open(full_path, "rb") as fp:
                    content_bytes = fp.read()
                
                # Create blob for binary or large files, or direct content for text
                try:
                    text_content = content_bytes.decode("utf-8")
                    # If clean UTF-8 text and < 100KB, send directly in tree
                    if len(content_bytes) < 100000:
                        tree_items.append({
                            "path": rel_path,
                            "mode": "100644",
                            "type": "blob",
                            "content": text_content
                        })
                        continue
                except UnicodeDecodeError:
                    pass
                
                # Binary blob creation
                blob_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/blobs"
                b64_content = base64.b64encode(content_bytes).decode("ascii")
                blob_resp = api_request(blob_url, token, {
                    "content": b64_content,
                    "encoding": "base64"
                }, method="POST")
                tree_items.append({
                    "path": rel_path,
                    "mode": "100644",
                    "type": "blob",
                    "sha": blob_resp["sha"]
                })
            except Exception as err:
                print(f"Skipping {rel_path}: {err}")

    print(f"Prepared {len(tree_items)} files for commit.")

    # 3. Create Tree
    tree_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/trees"
    tree_payload = {"tree": tree_items}
    tree_resp = api_request(tree_url, token, tree_payload, method="POST")
    tree_sha = tree_resp["sha"]
    print(f"Created Git Tree: {tree_sha}")

    # 4. Create Commit
    commit_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/commits"
    commit_payload = {
        "message": "Initial upload: AI Exam Question Paper Generator with Jayam Automobiles aesthetic & Vercel deployment config",
        "tree": tree_sha,
        "parents": [parent_commit_sha] if parent_commit_sha else []
    }
    commit_resp = api_request(commit_url, token, commit_payload, method="POST")
    commit_sha = commit_resp["sha"]
    print(f"Created Commit: {commit_sha}")

    # 5. Update branch reference
    if parent_commit_sha:
        update_ref_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/refs/heads/{BRANCH}"
        api_request(update_ref_url, token, {"sha": commit_sha, "force": True}, method="PATCH")
    else:
        create_ref_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/git/refs"
        api_request(create_ref_url, token, {"ref": f"refs/heads/{BRANCH}", "sha": commit_sha}, method="POST")

    print("\nSUCCESS! Successfully pushed all files to GitHub repository!")
    print(f"URL: https://github.com/{REPO_OWNER}/{REPO_NAME}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        token = os.environ.get("GITHUB_TOKEN")
        if not token:
            print("Usage: py push_to_github.py <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>")
            sys.exit(1)
    else:
        token = sys.argv[1].strip()
    upload_all(token)
