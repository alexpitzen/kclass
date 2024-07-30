all:
	sass --update scss:css
	cat tampermonkey_info.js kclass.js scss_start.js css/*.css kclass_end.js > output_dynamic_scss.js
