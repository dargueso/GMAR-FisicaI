WEB_REPO := /Users/daniel/Scripts/dargueso.github.io

.PHONY: deploy deploy-coriolis3d deploy-solar-system deploy-coriolis-carousel deploy-angular-momentum

# Sync every deployable simulation in one go.
deploy: deploy-coriolis3d deploy-solar-system deploy-coriolis-carousel deploy-angular-momentum
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

deploy-coriolis-carousel:
	$(eval SRC := simulations/coriolis-carousel)
	$(eval WEB := $(WEB_REPO)/simulations/coriolis-carousel)
	@mkdir -p $(WEB)
	cp $(SRC)/coriolis-carousel.html $(SRC)/*.js $(WEB)/
	python3 tools/inject_back_link.py $(WEB)/coriolis-carousel.html
	@echo "  Synced coriolis-carousel → $(WEB)"

deploy-angular-momentum:
	$(eval SRC := simulations/angular-momentum)
	$(eval WEB := $(WEB_REPO)/simulations/angular-momentum)
	@mkdir -p $(WEB)
	cp $(SRC)/index.html $(SRC)/*.js $(WEB)/
	python3 tools/inject_back_link.py $(WEB)/index.html
	@echo "  Synced angular-momentum → $(WEB)"
