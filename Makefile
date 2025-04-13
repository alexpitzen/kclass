all: .env
	sass --update scss:css
	.env/bin/python3 build.py

.env:
	python3 -m venv .env
	.env/bin/pip install jinja2
