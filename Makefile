all:
	sass --update scss:css
	cat kclass.js css/*.css kclass_end.js > output_dynamic_scss.js
