all:
	$(info )
	$(info Run with F5)
	$(info )
	vsce package

clean:
	rm *.vsix
