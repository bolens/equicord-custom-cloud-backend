.PHONY: check validate integration hooks-install package
check:
	npm run check
validate: check
	actionlint
	zizmor --offline --min-severity medium --min-confidence medium .github
	gitleaks dir . --redact --no-banner
integration:
	npm run integration
hooks-install:
	npm run hooks:install
package:
	npm run package
