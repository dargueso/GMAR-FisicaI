WEB_REPO := /Users/daniel/Scripts/dargueso.github.io
WEB      := $(WEB_REPO)/simulations/coriolis3d
SRC      := simulations/coriolis3d

.PHONY: deploy

deploy:
	@mkdir -p $(WEB)
	cp $(SRC)/coriolis3d.html $(SRC)/*.js $(WEB)/
	python3 tools/inject_back_link.py $(WEB)/coriolis3d.html
	@echo ""
	@echo "  Synced coriolis3d → $(WEB)"
	@echo "  Next:"
	@echo "    cd $(WEB_REPO) && git add -A && git commit -m 'sync coriolis3d' && git push"
	@echo ""
