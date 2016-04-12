import tornado.ioloop
import tornado.web
import tornado.escape
import struct

class MainHandler(tornado.web.RequestHandler):
    def get(self):    	
    	callbackFunc = ""
        if("callback" in self.request.arguments):
            callbackFunc = self.request.arguments["callback"][0]
            callbackFunc = str(callbackFunc)

    		self.set_header('Content-Type', 'application/javascript')

		ret = []
		if self.request.arguments["inf"] == "file"):
			for name in self.request.arguments["id[]"]:
				path = '../samples/' + name
				content = open(path, "r")
				ret.append(content.read())
		elif self.request.arguments["inf"] == "H3K27Ac":
			ret.append(self.request.arguments["start"])
			ret.append(self.request.arguments["end"])

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
