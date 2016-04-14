import tornado.ioloop
import tornado.web
import tornado.escape

def get_chip_seq(start, end):
	chip_seq = [];
	dis = end - start
	f = "Bind"
	step = 0

	if (dis < 41250):
		f += "25."
		s
	elif (dis < 165000) f += "100."
	elif (dis < 1650000) f += "1000."
	elif (dis < 16500000) f += "10000."
	else f += "100000."

	for i in range(0, 6):
		f += i + ".bin"
		chip_seq.append([])
		 
	

class MainHandler(tornado.web.RequestHandler):
    def get(self):    	
    	callbackFunc = ""
        if("callback" in self.request.arguments):
            callbackFunc = self.request.arguments["callback"][0]
            callbackFunc = str(callbackFunc)


        self.set_header('Content-Type', 'application/javascript')
	ret = []

	if self.request.arguments["inf"][0] == "file":
		print self.request.arguments["inf"]
		for name in self.request.arguments["id[]"]:
			path = '../samples/' + name
			content = open(path, "r")
			ret.append(content.read())
	elif self.request.arguments["inf"][0] == "H3K27Ac":
		ret = get_chip_seq(self.request.arguments["start"][0], self.request.arguments["end"][0])
        self.write("{jsfunc}({json});".format(jsfunc=callbackFunc, json=tornado.escape.json_encode({"content": ret})))
        self.finish()

def make_app():
    return tornado.web.Application([
        (r"/teatlas_ajax", MainHandler),
    ])

if __name__ == "__main__":
    app = make_app()
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()
