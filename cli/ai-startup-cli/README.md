# AI Startup CLI

Target commands:

```text
ai-startup build-product
ai-startup ship-feature
ai-startup fix-bug
ai-startup new "AI private-domain automation system"
```

Expected orchestration:

- market analysis
- PRD generation
- architecture design
- code generation
- testing

Current demo commands in this repository:

```text
node cli/ai-startup-cli/index.mjs new "AI private-domain automation system"
node cli/ai-startup-cli/index.mjs run build-product "AI private-domain automation system"
node cli/ai-startup-cli/index.mjs run fix-bug
node cli/ai-startup-cli/index.mjs inspect <workflow-instance-id>
node cli/ai-startup-cli/index.mjs inspect-latest build-product
```

Runtime control chain:

```text
create company
-> load agents
-> load skills
-> load rules
-> run workflow
```
