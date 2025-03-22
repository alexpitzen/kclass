for i in some files; do magick convert -sharpen 0x100 -density 50 $i -resize 12288x20320 output_$(echo $i | cut -d\. -f1).svg &; done
