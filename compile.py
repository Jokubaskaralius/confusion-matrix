import jinja2

env = jinja2.Environment(loader=jinja2.FileSystemLoader('templates'))

template = env.get_template('accuracy_playground.html').stream({})

# write output
template.dump('index.html')
