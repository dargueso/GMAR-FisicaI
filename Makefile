WEB_REPO := /Users/daniel/Scripts/dargueso.github.io

.PHONY: deploy deploy-coriolis3d deploy-solar-system

# Sync every deployable simulation in one go.
deploy: deploy-coriolis3d deploy-solar-system
	@echo ""
	@echo "  All simulations synced → $(WEB_REPO)/simulations"
	@echo "  Next:"
	@echo "    cd $(WEB_REPO) && git add -A && git commit -m 'sync simulations' && git push"
	@echo ""

deploy-coriolis3d:
	$(eval SRC := simulations/coriolis3d)
	$(eval WEB := $(WEB_REPO)/simulations/coriolis3d)
	@mkdir -p $(WEB)
	cp $(SRC)/coriolis3d.html $(SRC)/*.js $(WEB)/
	python3 tools/inject_back_link.py $(WEB)/coriolis3d.html
	@echo "  Synced coriolis3d → $(WEB)"

deploy-solar-system:
	$(eval SRC := simulations/solar-system)
	$(eval WEB := $(WEB_REPO)/simulations/solar-system)
	@mkdir -p $(WEB)
	cp $(SRC)/solar-system.html $(SRC)/*.js $(WEB)/
	python3 tools/inject_back_link.py $(WEB)/solar-system.html
	@echo "  Synced solar-system → $(WEB)"
