all:
	sass --update scss:css
	cat kclass.js css/horizontal_all.css css/horizontal_dynamic_big.css css/horizontal_dynamic_medium.css css/horizontal_dynamic_small.css kclass_end.js > output_dynamic_scss.js
