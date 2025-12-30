---
name: Cursor Tool Configuration
date: 2025-12-30
topics:
  - ai
  - best practices
---

# Cursor Tool Configuration

- write own rules
- modify IDE settings
- modify git settings

An interesting meta-moment occurred I realized that I can have Cursor instruct me in how to adjust its settings, e.g.
[`abc9e17`](https://github.com/Isaac-DeFrain/blog/commit/abc9e17) - "chore(vscode):
format on save". This commit added comprehensive VSCode settings that
configured:

- Format on save for TypeScript, JavaScript, JSON, CSS, HTML, and Markdown
- Prettier as the default formatter across all these file types

This represents Cursor (the AI assistant) helping to configure its own
development environment - setting up the editor settings that would ensure
consistent code formatting going forward. The settings file
(`/.vscode/settings.json`) became a permanent part of the project, ensuring
that anyone working on the codebase would benefit from automatic formatting.

## Cursor for Git Commits

By far the best use of cursor I've found is to have it break up work into several small git commits and suggest a
commit message for each. It tends to do an awesome job with this task, the commit messages are typically high quality,
it copies your style, and I find that I rarely update the commit message as a result. Before using cursor in this way, I
would easily spend several hours a week breaking up my git commits using complex graphical tools like GitKraken. It is
hard to overstate how much of a game-changer this is!

I'd be curious to explore using cursor for resolving merge conflicts too; the only thing I enjoy less than breaking up a
large amount of work into reasonably-sized, logical git commits.

## Cursor
