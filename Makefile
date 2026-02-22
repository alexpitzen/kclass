all: .env
	sass --update assets/scss:css
	.env/bin/python3 tooling/build.py

.env:
	python3 -m venv .env
	.env/bin/pip install jinja2
