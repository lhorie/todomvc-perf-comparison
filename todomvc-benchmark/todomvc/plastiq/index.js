(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var plastiq = require('plastiq');
var router = require('plastiq-router');
var h = plastiq.html;

router.start({history: router.hash});

var routes = {
  all: router.route('/'),
  filter: router.route('/:filter')
};

function createApp() {
  return {
    todos: [],

    filters: {
      all: function () {
        return true;
      },

      active: function (todo) {
        return !todo.completed;
      },

      completed: function (todo) {
        return todo.completed;
      }
    },

    render: function () {
      var self = this;

      function addTodo(ev) {
        ev.preventDefault();

        self.todos.push({
          title: self.todoTitle,
          completed: false
        });

        self.todoTitle = '';
      }

      var remaining = this.todos.filter(function (todo) {
        return !todo.completed;
      });

      var remainingCount = remaining.length;
      var completedCount = this.todos.length - remainingCount;

      function clearCompletedTodos() {
        self.todos = remaining;
      }

      function renderFilter(name, title) {
        var route = name == 'all'
          ? routes.all()
          : routes.filter({filter: name});

        return h('li', route.link({class: {selected: route.active}}, title));
      }

      function eitherRoute(fn) {
        return routes.all(function () {
          return fn({filter: 'all'});
        }) || routes.filter(function (params) {
          return fn(params);
        })
      }

      return eitherRoute(function (params) {
        var filterName = params.filter || 'all';
        var filter = self.filters[filterName];

        return h('div',
          h('section.todoapp',
            h('header.header',
              h('h1', 'todos'),
              h('form.todo-form', {onsubmit: addTodo},
                h('input.new-todo', {type: 'text', placeholder: 'What needs to be done?', binding: [self, 'todoTitle']})
              )
            ),
            self.todos.length
              ? [
                  h('section.main',
                    h('input.toggle-all', {type: 'checkbox', binding: [self, 'allChecked']}),
                    h('label', {for: 'toggle-all'}, 'Mark all as complete'),
                    h('ul.todo-list',
                      self.todos.map(function (todo, todoIndex) {
                        function editTodo() {
                          todo.editedTitle = todo.title;
                          self.editedTodo = todo;
                        }

                        function finishEditingTodo(ev) {
                          if (ev.type == 'submit') {
                            ev.preventDefault();
                          }
                          if (self.editedTodo) {
                            self.editedTodo.title = self.editedTodo.editedTitle;
                            delete self.editedTodo;
                          }
                        }

                        function handleEscape(ev) {
                          if (ev.keyCode == 27) {
                            delete self.editedTodo;
                          }
                        }

                        function removeTodo() {
                          self.todos.splice(todoIndex, 1);
                          console.log('deleted', todo);
                        }

                        if (filter(todo)) {
                          return h('li',
                            {
                              class: {
                                completed: todo.completed,
                                editing: todo == self.editedTodo
                              }
                            },
                            h('div.view',
                              h('input.toggle', {type: 'checkbox', binding: [todo, 'completed']}),
                              h('label', {onclick: editTodo}, todo.title),
                              h('button.destroy', {onclick: removeTodo})
                            ),
                            h('form', {onsubmit: finishEditingTodo},
                              h('input.edit', {
                                type: 'text',
                                onblur: finishEditingTodo,
                                onkeydown: handleEscape,
                                binding: [todo, 'editedTitle']
                              })
                            )
                          );
                        }
                      })
                    )
                  ),
                  h('footer.footer',
                    h('span.todo-count',
                      h('strong', remainingCount), ' ',
                      remainingCount == 1
                        ? 'item left'
                        : 'items left'
                    ),
                    h('ul.filters',
                      renderFilter('all', 'All'),
                      renderFilter('active', 'Active'),
                      renderFilter('completed', 'Completed')
                    ),
                    completedCount
                      ? h('button.clear-completed', {onclick: clearCompletedTodos},
                          'Clear completed ' + completedCount
                        )
                      : undefined
                  )
                ]
              : undefined
          )
        );
      });
    }
  };
}

plastiq.append(document.body, createApp());

},{"plastiq":7,"plastiq-router":2}],2:[function(require,module,exports){
var routism = require('routism');
var plastiq = require('plastiq');
var h = plastiq.html;
var refresh;

function Routes() {
  this.routes = [];
  this.routesChanged = false;
}

Routes.prototype.recognise = function (pathname) {
  if (this.routesChanged) {
    this.compiledRoutes = routism.compile(this.routes);
    this.routesChanged = false;
  }

  return this.compiledRoutes.recognise(pathname);
};

Routes.prototype.add = function (pattern) {
  var route = {pattern: pattern};
  this.routes.push({pattern: pattern, route: route});
  this.routesChanged = true;
  return route;
};

function Router() {
  this.routes = new Routes();
}

Router.prototype.start = function (history) {
  this.history = history;
  this.history.start();
  this.started = true;
};

Router.prototype.stop = function () {
  if (this.started) {
    this.history.stop();

    var keys = Object.keys(this);
    for (var n = 0; n < keys.length; n++) {
      if (keys[n] != 'routes') {
        delete this[keys[n]];
      }
    }
  }
};

Router.prototype.isNotFound = function () {
  if (this.currentRoute.isNotFound) {
    return this.currentRoute;
  }
};

Router.prototype.makeCurrentRoute = function () {
  var location = this.history.location();
  var href = location.pathname + location.search;

  if (!this.currentRoute || this.currentRoute.href != href) {
    var routeRecognised = this.routes.recognise(location.pathname);

    if (routeRecognised) {
      var search = location.search && parseSearch(location.search);
      var paramArray = search
        ? search.concat(routeRecognised.params)
        : routeRecognised.params;

      var params = associativeArrayToObject(paramArray);

      var expandedUrl = expand(routeRecognised.route.pattern, params);
      var self = this;

      if (this.currentRoute && this.currentRoute.ondeparture) {
        this.currentRoute.ondeparture();
      }

      this.currentRoute = {
        route: routeRecognised.route,
        params: params,
        href: href,
        expandedUrl: expandedUrl,
        replace: function (params) {
          var url = expand(this.route.pattern, params);
          this.params = params;
          self.replace(url);
        }
      };
    } else {
      this.currentRoute = {
        isNotFound: true,
        href: href
      };
    }
  }
};

Router.prototype.setupRender = function () {
  if (h.currentRender && !h.currentRender.routerEstablished) {
    h.currentRender.routerEstablished = true;

    this.lastHref = this.currentHref;

    var location = this.history.location();
    var href = location.pathname + location.search;
    this.currentHref = href;

    this._isNewHref = this.lastHref != this.currentHref;

    this.makeCurrentRoute();
  }
};

Router.prototype.isNewHref = function () {
  return this._isNewHref;
};

Router.prototype.isCurrentRoute = function (route) {
  this.makeCurrentRoute();

  if (this.currentRoute.route === route) {
    return this.currentRoute;
  }
};

Router.prototype.add = function (pattern) {
  return this.routes.add(pattern);
};

Router.prototype.pushOrReplace = function (pushReplace, url, options) {
  if ((options && options.force) || !this.currentRoute || this.currentRoute.expandedUrl != url) {
    this.history[pushReplace](url);
    var location = this.history.location();

    if (this.currentRoute.ondeparture) {
      this.currentRoute.ondeparture();
    }

    if (refresh) {
      refresh();
    }
  }
};

Router.prototype.push = function (url, options) {
  this.pushOrReplace('push', url, options);
};

Router.prototype.replace = function (url, options) {
  this.pushOrReplace('replace', url, options);
};

function createRouter() {
  return new Router();
}

function escapeRegex(pattern) {
  return pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

var splatVariableRegex = /(\:([a-z\-_]+)\\\*)/ig;
var variableRegex = /(:([-a-z_]+))/ig;

function compilePattern(pattern) {
  return escapeRegex(pattern)
    .replace(splatVariableRegex, "(.+)")
    .replace(variableRegex, "([^\/]+)");
}

function preparePattern(pattern) {
  var match;
  var variableRegex = new RegExp('(:([-a-z_]+))', 'ig');
  var variables = [];

  while (match = variableRegex.exec(pattern)) {
    variables.push(match[2]);
  }

  var patternRegex = new RegExp('^' + compilePattern(pattern));

  return {
    regex: patternRegex,
    variables: variables
  };
}

function matchUnder(pattern) {
  var patternVariables = preparePattern(pattern);

  return function (path) {
    var match = patternVariables.regex.exec(path);

    if (match) {
      var params = {};

      for (var n = 1; n < match.length; n++) {
        params[patternVariables.variables[n - 1]] = match[n];
      }

      return params;
    }
  };
}

var router = createRouter();

function parseSearch(search) {
  return search && search.substring(1).split('&').map(function (param) {
    return param.split('=').map(decodeURIComponent);
  });
}

var popstateListener;

exports.start = function (options) {
  if (!router) {
    router = createRouter();
  }
  router.start((options && options.history) || exports.historyApi);
};

exports.stop = function () {
  router.stop();
};

exports.clear = function () {
  router.stop();
  router = undefined;
};

exports.route = function (pattern) {
  var route = router.add(pattern);

  function routeFn (paramBindings, render) {
    if (typeof paramBindings === 'function') {
      render = paramBindings;
      paramBindings = undefined;
    }

    if (!render) {
      var params = paramBindings || {};
      var url = expand(pattern, params);

      var currentRoute = router.started && router.isCurrentRoute(route);

      return {
        push: function (ev) {
          if (ev) {
            ev.preventDefault();
          }

          router.push(url);
        },

        replace: function (ev) {
          if (ev) {
            ev.preventDefault();
          }

          router.replace(url);
        },

        active: currentRoute && currentRoute.expandedUrl == url,

        href: url,

        a: function () {
          return this.link.apply(this, arguments);
        },

        link: function () {
          var options;
          if (arguments[0] && arguments[0].constructor == Object) {
            options = arguments[0];
            content = Array.prototype.slice.call(arguments, 1);
          } else {
            options = {};
            content = Array.prototype.slice.call(arguments, 0);
          }

          options.href = url;
          options.onclick = this.push.bind(this);

          return h.apply(h, ['a', options].concat(content));
        }
      };
    } else {
      if (!router.started) {
        throw new Error("router not started yet, start with require('plastiq-router').start([history])");
      }

      router.setupRender();

      refresh = h.refresh;
      var currentRoute = router.isCurrentRoute(route);
      var isNew = router.isNewHref();

      if (currentRoute) {
        if (paramBindings) {
          var onarrival = paramBindings.onarrival && h.refreshify(paramBindings.onarrival, {refresh: 'promise'});
          delete paramBindings.onarrival;
          currentRoute.ondeparture = paramBindings.ondeparture;
          delete paramBindings.ondeparture;

          if (isNew) {
            setParamBindings(currentRoute.params, paramBindings);

            if (onarrival) {
              onarrival(params);
            }
          } else {
            var newParams = getParamBindings(currentRoute.params, paramBindings);
            if (newParams) {
              currentRoute.replace(newParams);
            }
          }
        }

        return render(currentRoute.params);
      }
    }
  }

  var _underRegExp;
  function underRegExp() {
    if (!_underRegExp) {
      _underRegExp = matchUnder(pattern);
    }

    return _underRegExp;
  }

  routeFn.under = function (_paramBindings, _fn) {
    var paramBindings, fn;

    if (typeof _paramBindings === 'function') {
      fn = _paramBindings;
    } else {
      paramBindings = _paramBindings;
      fn = _fn;
    }

    var params = underRegExp()(router.history.location().pathname);

    if (params && paramBindings && fn) {
      router.setupRender();

      if (router.isNewHref()) {
        setParamBindings(params, paramBindings);
      } else {
        var newParams = getParamBindings(router.currentRoute.params, paramBindings);
        if (newParams) {
          router.currentRoute.replace(newParams);
        }
      }
    }

    if (fn) {
      if (params) {
        return fn(params);
      }
    } else {
      return {
        active: !!params
      };
    }
  };

  routeFn.pattern = pattern;
  
  return routeFn;
};

function setParamBindings(params, paramBindings) {
  var paramKeys = Object.keys(params);
  for (var n = 0; n < paramKeys.length; n++) {
    var param = paramKeys[n];
    var value = params[param];

    var paramBinding = paramBindings[param];
    if (paramBinding) {
      var binding = h.binding(paramBinding, {refresh: 'promise'})
      if (binding.set) {
        binding.set(value);
      }
    }
  }
}

function getParamBindings(params, paramBindings) {
  var bindings = Object.keys(paramBindings).map(function (key) {
    return {
      key: key,
      binding: h.binding(paramBindings[key])
    };
  });

  var allBindingsHaveGetters = !bindings.some(function (b) {
    return !b.binding.get;
  });

  if (allBindingsHaveGetters) {
    var newParams = {};

    var paramKeys = Object.keys(params);
    for(var n = 0; n < paramKeys.length; n++) {
      var param = paramKeys[n];
      newParams[param] = params[param];
    }

    for(var n = 0; n < bindings.length; n++) {
      var b = bindings[n];
      if (b.binding.get) {
        var value = b.binding.get();
        newParams[b.key] = value;
      }
    }

    return newParams;
  }
}

exports.notFound = function (render) {
  var notFoundRoute = router.isNotFound();

  if (notFoundRoute) {
    return render(notFoundRoute.href);
  }
};

function associativeArrayToObject(array) {
  var o = {};

  for(var n = 0; n < array.length; n++) {
    var pair = array[n];
    o[pair[0]] = pair[1];
  }

  return o;
}

function paramToString(p) {
  if (p === undefined || p === null) {
    return '';
  } else {
    return p;
  }
}

function expand(pattern, params) {
  var paramsExpanded = {};

  var url = pattern.replace(/:([a-z_][a-z0-9_]*)/gi, function (_, id) {
    var param = params[id];
    paramsExpanded[id] = true;
    return paramToString(param);
  });

  var query = Object.keys(params).map(function (key) {
    var param = paramToString(params[key]);

    if (!paramsExpanded[key] && param != '') {
      return encodeURIComponent(key) + '=' + encodeURIComponent(param);
    }
  }).filter(function (param) {
    return param;
  }).join('&');

  if (query) {
    return url + '?' + query;
  } else {
    return url;
  }
}

exports.historyApi = {
  start: function () {
    var self = this;
    if (!this.listening) {
      window.addEventListener('popstate', function(ev) {
        if (self.active) {
          self.popstate = true;
          self.popstateState = ev.state;
          if (refresh) {
            refresh();
          }
        }
      });
      this.listening = true;
    }

    this.active = true;
  },
  stop: function () {
    // I _think_ this is a chrome bug
    // if we removeEventListener then history.back() doesn't work
    // Chrome Version 43.0.2357.81 (64-bit), Mac OS X 10.10.3
    // yeah...
    this.active = false;
  },
  location: function () {
    return window.location;
  },
  push: function (url) {
    window.history.pushState(undefined, undefined, url);
  },
  state: function (state) {
    window.history.replaceState(state);
  },
  replace: function (url) {
    window.history.replaceState(undefined, undefined, url);
  }
};

exports.hash = {
  start: function () {
    var self = this;
    if (!this.listening) {
      this.hashchangeListener = function(ev) {
        if (!self.pushed) {
          if (refresh) {
            refresh();
          }
        } else {
          self.pushed = false;
        }
      }
      window.addEventListener('hashchange', this.hashchangeListener);
      this.listening = true;
    }
  },
  stop: function () {
    this.listening = false;
    window.removeEventListener('hashchange', this.hashchangeListener);
  },
  location: function () {
    var path = window.location.hash || '#';

    var m = /^#(.*?)(\?.*)?$/.exec(path);

    return {
      pathname: '/' + m[1],
      search: m[2] || ''
    }
  },
  push: function (url) {
    this.pushed = true;
    window.location.hash = url.replace(/^\//, '');
  },
  state: function (state) {
  },
  replace: function (url) {
    return this.push(url);
  }
};

},{"plastiq":7,"routism":3}],3:[function(require,module,exports){
(function() {
    var self = this;
    var variableRegex, splatVariableRegex, escapeRegex, addGroupForTo, addVariablesInTo, compile, recogniseIn, extractParamsForFromAfter;
    variableRegex = /(\:([a-z\-_]+))/gi;
    splatVariableRegex = /(\:([a-z\-_]+)\\\*)/gi;
    escapeRegex = function(pattern) {
        return pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    };
    exports.table = function() {
        var self = this;
        var rows;
        rows = [];
        return {
            add: function(pattern, route) {
                var self = this;
                return rows.push({
                    pattern: pattern,
                    route: route
                });
            },
            compile: function() {
                var self = this;
                return exports.compile(rows);
            }
        };
    };
    exports.compile = function(routeTable) {
        var self = this;
        var groups, regexen, gen1_items, gen2_i, row;
        groups = [];
        regexen = [];
        gen1_items = routeTable;
        for (gen2_i = 0; gen2_i < gen1_items.length; ++gen2_i) {
            row = gen1_items[gen2_i];
            addGroupForTo(row, groups);
            regexen.push("(" + compile(row.pattern) + ")");
        }
        return {
            regex: new RegExp("^(" + regexen.join("|") + ")$"),
            groups: groups,
            recognise: function(input) {
                var self = this;
                return recogniseIn(self.regex.exec(input) || [], self.groups);
            }
        };
    };
    addGroupForTo = function(row, groups) {
        var group;
        group = {
            route: row.route,
            params: []
        };
        groups.push(group);
        return addVariablesInTo(row.pattern, group);
    };
    addVariablesInTo = function(pattern, group) {
        var match;
        while (match = variableRegex.exec(pattern)) {
            group.params.push(match[2]);
        }
        return void 0;
    };
    compile = function(pattern) {
        return escapeRegex(pattern).replace(splatVariableRegex, "(.+)").replace(variableRegex, "([^\\/]+)");
    };
    exports.compilePattern = function(pattern) {
        var self = this;
        return compile(pattern);
    };
    recogniseIn = function(match, groups) {
        var g, i, gen3_forResult;
        g = 0;
        for (i = 2; i < match.length; i = i + groups[g - 1].params.length + 1) {
            gen3_forResult = void 0;
            if (function(i) {
                if (typeof match[i] !== "undefined") {
                    gen3_forResult = {
                        route: groups[g].route,
                        params: extractParamsForFromAfter(groups[g], match, i)
                    };
                    return true;
                }
                g = g + 1;
            }(i)) {
                return gen3_forResult;
            }
        }
        return false;
    };
    extractParamsForFromAfter = function(group, match, i) {
        var params, p;
        params = [];
        for (p = 0; p < group.params.length; p = p + 1) {
            params.push([ group.params[p], decodeURIComponent(match[p + i + 1]) ]);
        }
        return params;
    };
}).call(this);
},{}],4:[function(require,module,exports){
var vtext = require("virtual-dom/vnode/vtext.js")

module.exports = function (child) {
  if (child === undefined || child === null) {
    return undefined;
  } else if (typeof(child) != 'object') {
    return new vtext(String(child));
  } else if (child instanceof Date) {
    return new vtext(String(child));
  } else if (child instanceof Error) {
    return new vtext(child.toString());
  } else {
    return child;
  }
};

},{"virtual-dom/vnode/vtext.js":39}],5:[function(require,module,exports){
var h = require('./rendering').html;
var VText = require("virtual-dom/vnode/vtext.js")
var domComponent = require('./domComponent');

function ComponentWidget(state, vdom) {
  this.state = state;
  this.key = state.key;
  if (typeof vdom === 'function') {
    this.render = function () {
      if (h.currentRender) {
        h.currentRender.eventHandlerWrapper = state.on;
      }
      return vdom.apply(this.state, arguments);
    };
    this.canRefresh = true;
  } else {
    vdom = vdom || new VText('');
    this.render = function () {
      return vdom;
    }
  }
  this.cacheKey = state.cacheKey;
  this.component = domComponent();

  var renderFinished = h.currentRender && h.currentRender.finished;
  if (renderFinished) {
    var self = this;
    this.afterRender = function (fn) {
      renderFinished.then(fn);
    };
  } else {
    this.afterRender = function () {};
  }
}

ComponentWidget.prototype.type = 'Widget';

ComponentWidget.prototype.init = function () {
  var self = this;

  if (self.state.onbeforeadd) {
    self.state.onbeforeadd();
  }

  var vdom = this.render(this);
  if (vdom instanceof Array) {
    throw new Error('vdom returned from component cannot be an array');
  }

  var element = this.component.create(vdom);

  if (self.state.onadd) {
    this.afterRender(function () {
      self.state.onadd(element);
    });
  }

  if (self.state.detached) {
    return document.createTextNode('');
  } else {
    return element;
  }
};

ComponentWidget.prototype.update = function (previous) {
  var self = this;

  var refresh = !this.cacheKey || this.cacheKey !== previous.cacheKey;

  if (refresh) {
    if (self.state.onupdate) {
      this.afterRender(function () {
        self.state.onupdate(self.component.element);
      });
    }
  }

  this.component = previous.component;
  
  if (previous.state && this.state) {
    var keys = Object.keys(this.state);
    for(var n = 0; n < keys.length; n++) {
      var key = keys[n];
      previous.state[key] = self.state[key];
    }
    this.state = previous.state;
  }

  if (refresh) {
    var element = this.component.update(this.render(this));

    if (self.state.detached) {
      return document.createTextNode('');
    } else {
      return element;
    }
  }
};

ComponentWidget.prototype.refresh = function () {
  this.component.update(this.render(this));
  if (this.state.onupdate) {
    this.state.onupdate(this.component.element);
  }
};

ComponentWidget.prototype.destroy = function (element) {
  var self = this;

  if (self.state.onremove) {
    this.afterRender(function () {
      self.state.onremove(element);
    });
  }

  this.component.destroy();
};

module.exports = function (state, vdom) {
  if (typeof state === 'function') {
    return new ComponentWidget({}, state);
  } else if (state.constructor === Object) {
    return new ComponentWidget(state, vdom);
  } else {
    return new ComponentWidget({}, state);
  }
};

module.exports.ComponentWidget = ComponentWidget;

},{"./domComponent":6,"./rendering":43,"virtual-dom/vnode/vtext.js":39}],6:[function(require,module,exports){
var createElement = require('virtual-dom/create-element');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var coerceToVdom = require('./coerceToVdom');

function DomComponent() {
}

DomComponent.prototype.create = function (vdom) {
  vdom = coerceToVdom(vdom);
  this.vdom = vdom;
  this.element = createElement(vdom);
  return this.element;
};

DomComponent.prototype.update = function (vdom) {
  var patches = diff(this.vdom, vdom);
  this.element = patch(this.element, patches);
  this.vdom = vdom;
  return this.element;
};

DomComponent.prototype.destroy = function (options) {
  function destroyWidgets(vdom) {
    if (vdom.type === 'Widget') {
      vdom.destroy();
    } else if (vdom.children) {
      vdom.children.forEach(destroyWidgets);
    }
  }

  destroyWidgets(this.vdom);

  if (options && options.removeElement && this.element.parentNode) {
    this.element.parentNode.removeChild(this.element);
  }
};

function domComponent() {
  return new DomComponent();
}

module.exports = domComponent;

},{"./coerceToVdom":4,"virtual-dom/create-element":9,"virtual-dom/diff":10,"virtual-dom/patch":19}],7:[function(require,module,exports){
var rendering = require('./rendering');

exports.html = rendering.html;
exports.attach = rendering.attach;
exports.replace = rendering.replace;
exports.append = rendering.append;

exports.bind = require('./oldbind');
exports.binding = rendering.binding;

var windowEvents = require('./windowEvents');

exports.html.window = function (attributes, vdom) {
  return windowEvents(attributes, vdom, rendering.html.refreshify);
};

exports.html.component = require('./component');

},{"./component":5,"./oldbind":42,"./rendering":43,"./windowEvents":45}],8:[function(require,module,exports){
module.exports = function (model, property) {
  var plastiqMeta = model._plastiqMeta;

  if (!plastiqMeta) {
    plastiqMeta = {};
    Object.defineProperty(model, '_plastiqMeta', {value: plastiqMeta});
  }

  var meta = plastiqMeta[property];

  if (!meta) {
    meta = plastiqMeta[property] = {};
  }

  return meta;
};

},{}],9:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":21}],10:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":41}],11:[function(require,module,exports){
var h = require("./virtual-hyperscript/index.js")

module.exports = h

},{"./virtual-hyperscript/index.js":28}],12:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],13:[function(require,module,exports){
'use strict';

var OneVersionConstraint = require('individual/one-version');

var MY_VERSION = '7';
OneVersionConstraint('ev-store', MY_VERSION);

var hashKey = '__EV_STORE_KEY@' + MY_VERSION;

module.exports = EvStore;

function EvStore(elem) {
    var hash = elem[hashKey];

    if (!hash) {
        hash = elem[hashKey] = {};
    }

    return hash;
}

},{"individual/one-version":15}],14:[function(require,module,exports){
(function (global){
'use strict';

/*global window, global*/

var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual;

function Individual(key, value) {
    if (key in root) {
        return root[key];
    }

    root[key] = value;

    return value;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],15:[function(require,module,exports){
'use strict';

var Individual = require('./index.js');

module.exports = OneVersion;

function OneVersion(moduleName, version, defaultValue) {
    var key = '__INDIVIDUAL_ONE_VERSION_' + moduleName;
    var enforceKey = key + '_ENFORCE_SINGLETON';

    var versionValue = Individual(enforceKey, version);

    if (versionValue !== version) {
        throw new Error('Can only have one copy of ' +
            moduleName + '.\n' +
            'You already have version ' + versionValue +
            ' installed.\n' +
            'This means you cannot install version ' + version);
    }

    return Individual(key, defaultValue);
}

},{"./index.js":14}],16:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":46}],17:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],18:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],19:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":24}],20:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":32,"is-object":17}],21:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":30,"../vnode/is-vnode.js":33,"../vnode/is-vtext.js":34,"../vnode/is-widget.js":35,"./apply-properties":20,"global/document":16}],22:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],23:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":35,"../vnode/vpatch.js":38,"./apply-properties":20,"./update-widget":25}],24:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var render = require("./create-element")
var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches, renderOptions) {
    renderOptions = renderOptions || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render

    return renderOptions.patch(rootNode, patches, renderOptions)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./create-element":21,"./dom-index":22,"./patch-op":23,"global/document":16,"x-is-array":18}],25:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":35}],26:[function(require,module,exports){
'use strict';

var EvStore = require('ev-store');

module.exports = EvHook;

function EvHook(value) {
    if (!(this instanceof EvHook)) {
        return new EvHook(value);
    }

    this.value = value;
}

EvHook.prototype.hook = function (node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = this.value;
};

EvHook.prototype.unhook = function(node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = undefined;
};

},{"ev-store":13}],27:[function(require,module,exports){
'use strict';

module.exports = SoftSetHook;

function SoftSetHook(value) {
    if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value);
    }

    this.value = value;
}

SoftSetHook.prototype.hook = function (node, propertyName) {
    if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
    }
};

},{}],28:[function(require,module,exports){
'use strict';

var isArray = require('x-is-array');

var VNode = require('../vnode/vnode.js');
var VText = require('../vnode/vtext.js');
var isVNode = require('../vnode/is-vnode');
var isVText = require('../vnode/is-vtext');
var isWidget = require('../vnode/is-widget');
var isHook = require('../vnode/is-vhook');
var isVThunk = require('../vnode/is-thunk');

var parseTag = require('./parse-tag.js');
var softSetHook = require('./hooks/soft-set-hook.js');
var evHook = require('./hooks/ev-hook.js');

module.exports = h;

function h(tagName, properties, children) {
    var childNodes = [];
    var tag, props, key, namespace;

    if (!children && isChildren(properties)) {
        children = properties;
        props = {};
    }

    props = props || properties || {};
    tag = parseTag(tagName, props);

    // support keys
    if (props.hasOwnProperty('key')) {
        key = props.key;
        props.key = undefined;
    }

    // support namespace
    if (props.hasOwnProperty('namespace')) {
        namespace = props.namespace;
        props.namespace = undefined;
    }

    // fix cursor bug
    if (tag === 'INPUT' &&
        !namespace &&
        props.hasOwnProperty('value') &&
        props.value !== undefined &&
        !isHook(props.value)
    ) {
        props.value = softSetHook(props.value);
    }

    transformProperties(props);

    if (children !== undefined && children !== null) {
        addChild(children, childNodes, tag, props);
    }


    return new VNode(tag, props, childNodes, key, namespace);
}

function addChild(c, childNodes, tag, props) {
    if (typeof c === 'string') {
        childNodes.push(new VText(c));
    } else if (typeof c === 'number') {
        childNodes.push(new VText(String(c)));
    } else if (isChild(c)) {
        childNodes.push(c);
    } else if (isArray(c)) {
        for (var i = 0; i < c.length; i++) {
            addChild(c[i], childNodes, tag, props);
        }
    } else if (c === null || c === undefined) {
        return;
    } else {
        throw UnexpectedVirtualElement({
            foreignObject: c,
            parentVnode: {
                tagName: tag,
                properties: props
            }
        });
    }
}

function transformProperties(props) {
    for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
            var value = props[propName];

            if (isHook(value)) {
                continue;
            }

            if (propName.substr(0, 3) === 'ev-') {
                // add ev-foo support
                props[propName] = evHook(value);
            }
        }
    }
}

function isChild(x) {
    return isVNode(x) || isVText(x) || isWidget(x) || isVThunk(x);
}

function isChildren(x) {
    return typeof x === 'string' || isArray(x) || isChild(x);
}

function UnexpectedVirtualElement(data) {
    var err = new Error();

    err.type = 'virtual-hyperscript.unexpected.virtual-element';
    err.message = 'Unexpected virtual child passed to h().\n' +
        'Expected a VNode / Vthunk / VWidget / string but:\n' +
        'got:\n' +
        errorString(data.foreignObject) +
        '.\n' +
        'The parent vnode is:\n' +
        errorString(data.parentVnode)
        '\n' +
        'Suggested fix: change your `h(..., [ ... ])` callsite.';
    err.foreignObject = data.foreignObject;
    err.parentVnode = data.parentVnode;

    return err;
}

function errorString(obj) {
    try {
        return JSON.stringify(obj, null, '    ');
    } catch (e) {
        return String(obj);
    }
}

},{"../vnode/is-thunk":31,"../vnode/is-vhook":32,"../vnode/is-vnode":33,"../vnode/is-vtext":34,"../vnode/is-widget":35,"../vnode/vnode.js":37,"../vnode/vtext.js":39,"./hooks/ev-hook.js":26,"./hooks/soft-set-hook.js":27,"./parse-tag.js":29,"x-is-array":18}],29:[function(require,module,exports){
'use strict';

var split = require('browser-split');

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

module.exports = parseTag;

function parseTag(tag, props) {
    if (!tag) {
        return 'DIV';
    }

    var noId = !(props.hasOwnProperty('id'));

    var tagParts = split(tag, classIdSplit);
    var tagName = null;

    if (notClassId.test(tagParts[1])) {
        tagName = 'DIV';
    }

    var classes, part, type, i;

    for (i = 0; i < tagParts.length; i++) {
        part = tagParts[i];

        if (!part) {
            continue;
        }

        type = part.charAt(0);

        if (!tagName) {
            tagName = part;
        } else if (type === '.') {
            classes = classes || [];
            classes.push(part.substring(1, part.length));
        } else if (type === '#' && noId) {
            props.id = part.substring(1, part.length);
        }
    }

    if (classes) {
        if (props.className) {
            classes.push(props.className);
        }

        props.className = classes.join(' ');
    }

    return props.namespace ? tagName : tagName.toUpperCase();
}

},{"browser-split":12}],30:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":31,"./is-vnode":33,"./is-vtext":34,"./is-widget":35}],31:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],32:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],33:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":36}],34:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":36}],35:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],36:[function(require,module,exports){
module.exports = "2"

},{}],37:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":31,"./is-vhook":32,"./is-vnode":33,"./is-widget":35,"./version":36}],38:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":36}],39:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":36}],40:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":32,"is-object":17}],41:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":30,"../vnode/is-thunk":31,"../vnode/is-vnode":33,"../vnode/is-vtext":34,"../vnode/is-widget":35,"../vnode/vpatch":38,"./diff-props":40,"x-is-array":18}],42:[function(require,module,exports){
module.exports = function (obj, prop) {
  console.log("plastiq.bind() will be deprecated in the next release, use [model, 'fieldName'] instead");

  return {
    get: function () {
      return obj[prop];
    },
    set: function (value) {
      obj[prop] = value;
    }
  };
};

},{}],43:[function(require,module,exports){
(function (global){
var h = require('virtual-dom/h');
var domComponent = require('./domComponent');
var simplePromise = require('./simplePromise');
var bindingMeta = require('./meta');
var coerceToVdom = require('./coerceToVdom');

function doThenFireAfterRender(attachment, fn) {
  try {
    exports.html.currentRender = {attachment: attachment};
    exports.html.currentRender.finished = simplePromise();
    exports.html.refresh = function (component) {
      if (exports.html.currentRender) {
        throw new Error("Don't call refresh.html.refresh during a render cycle. See https://github.com/featurist/plastiq#refresh-outside-render-cycle");
      }

      if (isComponent(component)) {
        refreshComponent(component, attachment);
      } else {
        attachment.refresh();
      }
    }

    fn();
  } finally {
    exports.html.currentRender.finished.fulfill();
    exports.html.currentRender.finished = undefined;
    delete exports.html.currentRender;
    exports.html.refresh = refreshOutOfRender;
  }
}

function refreshOutOfRender() {
  throw new Error('Please assign plastiq.html.refresh during a render cycle if you want to use it in event handlers. See https://github.com/featurist/plastiq#refresh-outside-render-cycle');
}

function isComponent(component) {
  return component
    && typeof component.init === 'function'
    && typeof component.update === 'function'
    && typeof component.destroy === 'function';
}

exports.append = function (element, render, model, options) {
  return startAttachment(render, model, options, function(createdElement) {
    element.appendChild(createdElement);
  });
};

exports.replace = function (element, render, model, options) {
  return startAttachment(render, model, options, function(createdElement) {
    var parent = element.parentNode;
    element.parentNode.replaceChild(createdElement, element);
  });
};

var attachmentId = 1;

function startAttachment(render, model, options, attachToDom) {
  if (typeof render == 'object' && typeof render.render == 'function') {
    return start(function () { return render.render(); }, model, attachToDom);
  } else {
    return start(function () { return render(model); }, options, attachToDom);
  }
}

function start(render, options, attachToDom) {
  var win = (options && options.window) || window;
  var requestRender = (options && options.requestRender) || win.requestAnimationFrame || win.setTimeout;
  var requested = false;

  function refresh() {
    if (!requested) {
      requestRender(function () {
        requested = false;

        if (attachment.attached) {
          doThenFireAfterRender(attachment, function () {
            var vdom = render();
            component.update(vdom);
          });
        }
      });
      requested = true;
    }
  }

  var attachment = {
    refresh: refresh,
    requestRender: requestRender,
    id: attachmentId++,
    attached: true
  }

  var component = domComponent();

  doThenFireAfterRender(attachment, function () {
    var vdom = render();
    attachToDom(component.create(vdom));
  });

  return {
    detach: function () {
      attachment.attached = false;
    },
    remove: function () {
      component.destroy({removeElement: true});
      attachment.attached = false;
    }
  };
};

exports.attach = function () {
  console.warn('plastiq.attach has been renamed to plastiq.append, plastiq.attach will be deprecated in a future version');
  return exports.append.apply(this, arguments);
}

function refreshComponent(component, attachment) {
  if (!component.canRefresh) {
    throw new Error("this component cannot be refreshed, make sure that the component's view is returned from a function");
  }

  if (!component.requested) {
    var requestRender = attachment.requestRender;

    requestRender(function () {
      doThenFireAfterRender(attachment, function () {
        component.requested = false;
        component.refresh();
      });
    });
    component.requested = true;
  }
}

var norefresh = {};

function refreshify(fn, options) {
  if (!fn) {
    return fn;
  }

  if (!exports.html.currentRender) {
    if (typeof global === 'object') {
      return fn;
    } else {
      throw new Error('You cannot create virtual-dom event handlers outside a render function. See https://github.com/featurist/plastiq#outside-render-cycle');
    }
  }

  var onlyRefreshAfterPromise = options && options.refresh == 'promise';
  var componentToRefresh = options && options.component;

  if (options && (options.norefresh == true || options.refresh == false)) {
    return fn;
  }

  var attachment = exports.html.currentRender.attachment;
  var r = attachment.refresh;

  return function () {
    var result = fn.apply(this, arguments);

    function handleResult(result, promiseResult) {
      var allowRefresh = !onlyRefreshAfterPromise || promiseResult;

      if (allowRefresh && result && typeof(result) == 'function') {
        console.warn('animations are now deprecated, you should consider using plastiq.html.refresh');
        result(r);
      } else if (result && typeof(result.then) == 'function') {
        if (allowRefresh) {
          r();
        }
        result.then(function (result) { handleResult(result, onlyRefreshAfterPromise); });
      } else if (
          result
          && typeof result.init === 'function'
          && typeof result.update === 'function'
          && typeof result.destroy === 'function') {
        refreshComponent(result, attachment);
      } else if (Object.prototype.toString.call(result) === '[object Array]'
          && result.length > 0
          && typeof result[0].init === 'function'
          && typeof result[0].update === 'function'
          && typeof result[0].destroy === 'function') {
        for (var i = 0; i < result.length; i++) {
          if(typeof result[i].init === 'function'
              && typeof result[i].update === 'function'
              && typeof result[i].destroy === 'function') {
            refreshComponent(result[i], attachment);
          }
        }
      } else if (componentToRefresh) {
        refreshComponent(componentToRefresh, attachment);
      } else if (result === norefresh) {
        // don't refresh;
      } else if (allowRefresh) {
        r();
        return result;
      }
    }

    return handleResult(result);
  };
}

function bindTextInput(attributes, children, get, set) {
  var textEventNames = ['onkeydown', 'oninput', 'onpaste', 'textInput'];

  var bindingValue = get();
  if (!(bindingValue instanceof Error)) {
    attributes.value = bindingValue != undefined? bindingValue: '';
  }

  attachEventHandler(attributes, textEventNames, function (ev) {
    if (bindingValue != ev.target.value) {
      set(ev.target.value);
    }
  });
}

function sequenceFunctions(handler1, handler2) {
  return function (ev) {
    handler1(ev);
    return handler2(ev);
  };
}

function insertEventHandler(attributes, eventName, handler, after) {
  var previousHandler = attributes[eventName];
  if (previousHandler) {
    if (after) {
      attributes[eventName] = sequenceFunctions(previousHandler, handler);
    } else {
      attributes[eventName] = sequenceFunctions(handler, previousHandler);
    }
  } else {
    attributes[eventName] = handler;
  }
}

function attachEventHandler(attributes, eventNames, handler) {
  if (eventNames instanceof Array) {
    for (var n = 0; n < eventNames.length; n++) {
      insertEventHandler(attributes, eventNames[n], handler);
    }
  } else {
    insertEventHandler(attributes, eventNames, handler);
  }
}

var inputTypeBindings = {
  text: bindTextInput,

  textarea: bindTextInput,

  checkbox: function (attributes, children, get, set) {
    attributes.checked = get();

    attachEventHandler(attributes, 'onclick', function (ev) {
      attributes.checked = ev.target.checked;
      set(ev.target.checked);
    });
  },

  radio: function (attributes, children, get, set) {
    var value = attributes.value;
    attributes.checked = get() == attributes.value;

    attachEventHandler(attributes, 'onclick', function (ev) {
      attributes.checked = true;
      set(value);
    });
  },

  select: function (attributes, children, get, set) {
    var currentValue = get();

    var options = children.filter(function (child) {
      return child.tagName.toLowerCase() == 'option';
    });

    var selectedOption = options.filter(function (child) {
      return child.properties.value == currentValue;
    })[0];

    var values = options.map(function (option) {
      return option.properties.value;
    });

    for(var n = 0; n < options.length; n++) {
      var option = options[n];
      option.properties.selected = option == selectedOption;
      option.properties.value = n;
    }

    attachEventHandler(attributes, 'onchange', function (ev) {
      set(values[ev.target.value]);
    });
  },

  file: function (attributes, children, get, set) {
    var multiple = attributes.multiple;

    attachEventHandler(attributes, 'onchange', function (ev) {
      if (multiple) {
        set(ev.target.files);
      } else {
        set(ev.target.files[0]);
      }
    });
  }
};

function bindModel(attributes, children, type) {
  var bind = inputTypeBindings[type] || bindTextInput;

  var bindingAttr = makeBinding(attributes.binding);
  bind(attributes, children, bindingAttr.get, bindingAttr.set);
}

function inputType(selector, attributes) {
  if (/^textarea\b/i.test(selector)) {
    return 'textarea';
  } else if (/^select\b/i.test(selector)) {
    return 'select';
  } else {
    return attributes.type || 'text';
  }
}

function flatten(startIndex, array) {
  var flatArray = [];

  function append(startIndex, array) {
    for(var n = startIndex; n < array.length; n++) {
      var item = array[n];
      if (item instanceof Array) {
        append(0, item);
      } else {
        flatArray.push(item);
      }
    }
  }

  append(startIndex, array);

  return flatArray;
}

function coerceChildren(children) {
  return children.map(coerceToVdom);
}

var renames = {
  for: 'htmlFor',
  class: 'className',
  contenteditable: 'contentEditable',
  tabindex: 'tabIndex',
  colspan: 'colSpan'
};

var dataAttributeRegex = /^data-/;

function prepareAttributes(selector, attributes, childElements) {
  var keys = Object.keys(attributes);
  var dataset;
  var eventHandlerWrapper = exports.html.currentRender && exports.html.currentRender.eventHandlerWrapper;

  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var attribute = attributes[key];

    if (typeof(attribute) == 'function') {
      if (eventHandlerWrapper) {
        attributes[key] = refreshify(exports.html.currentRender.eventHandlerWrapper.call(undefined, key.replace(/^on/, ''), attribute));
      } else {
        attributes[key] = refreshify(attribute);
      }
    }

    var rename = renames[key];
    if (rename) {
      attributes[rename] = attribute;
      delete attributes[key];
      continue;
    }

    if (dataAttributeRegex.test(key)) {
      if (!dataset) {
        dataset = attributes.dataset;

        if (!dataset) {
          dataset = attributes.dataset = {};
        }
      }

      var datakey = key.replace(dataAttributeRegex, '');
      dataset[datakey] = attribute;
      delete attributes[key];
      continue;
    }
  }

  if (attributes.className) {
    attributes.className = generateClassName(attributes.className);
  }

  if (attributes.binding) {
    bindModel(attributes, childElements, inputType(selector, attributes));
    delete attributes.binding;
  }
}

/**
 * this function is quite ugly and you may be very tempted
 * to refactor it into smaller functions, I certainly am.
 * however, it was written like this for performance
 * so think of that before refactoring! :)
 */
exports.html = function (hierarchySelector) {
  var hasHierarchy = hierarchySelector.indexOf(' ') >= 0;
  var selector, selectorElements;

  if (hasHierarchy) {
    selectorElements = hierarchySelector.match(/\S+/g);
    selector = selectorElements[selectorElements.length - 1];
  } else {
    selector = hierarchySelector;
  }

  var attributes;
  var childElements;
  var vdom;

  if (arguments[1] && arguments[1].constructor == Object) {
    attributes = arguments[1];
    childElements = coerceChildren(flatten(2, arguments));

    prepareAttributes(selector, attributes, childElements);

    vdom = h(selector, attributes, childElements);
  } else {
    childElements = coerceChildren(flatten(1, arguments));
    vdom = h(selector, childElements);
  }

  if (hasHierarchy) {
    for(var n = selectorElements.length - 2; n >= 0; n--) {
      vdom = h(selectorElements[n], vdom);
    }
  }

  return vdom;
};

exports.html.refreshify = refreshify;
exports.html.refresh = refreshOutOfRender;
exports.html.norefresh = norefresh;

function makeBinding(b, options) {
  var binding = b instanceof Array
    ?  bindingObject.apply(undefined, b)
    : b;

  binding.set = refreshify(binding.set, options);

  return binding;
};

function makeConverter(converter) {
  if (typeof converter == 'function') {
    return {
      view: function (model) {
        return model;
      },
      model: function (view) {
        return converter(view);
      }
    };
  } else {
    return converter;
  }
}

function chainConverters(startIndex, converters) {
  if ((converters.length - startIndex) == 1) {
    return makeConverter(converters[startIndex]);
  } else {
    var _converters;
    function makeConverters() {
      if (!_converters) {
        _converters = new Array(converters.length - startIndex);

        for(var n = startIndex; n < converters.length; n++) {
          _converters[n - startIndex] = makeConverter(converters[n]);
        }
      }
    }

    return {
      view: function (model) {
        makeConverters();
        var intermediateValue = model;
        for(var n = 0; n < _converters.length; n++) {
          intermediateValue = _converters[n].view(intermediateValue);
        }
        return intermediateValue;
      },

      model: function (view) {
        makeConverters();
        var intermediateValue = view;
        for(var n = _converters.length - 1; n >= 0; n--) {
          intermediateValue = _converters[n].model(intermediateValue);
        }
        return intermediateValue;
      }
    };
  }
}

function bindingObject(model, property, options) {
  if (arguments.length > 2) {
    var converter = chainConverters(2, arguments);

    return {
      get: function() {
        var meta = bindingMeta(model, property);

        var modelValue = model[property];
        if (meta.error) {
          return meta.view;
        } else if (meta.view === undefined) {
          var modelText = converter.view(modelValue);
          meta.view = modelText;
          return modelText;
        } else {
          var previousValue = converter.model(meta.view);
          var modelText = converter.view(modelValue);
          var normalisedPreviousText = converter.view(previousValue);

          if (modelText === normalisedPreviousText) {
            return meta.view;
          } else {
            meta.view = modelText;
            return modelText;
          }
        }
      },

      set: function(view) {
        var meta = bindingMeta(model, property);
        meta.view = view;

        try {
          model[property] = converter.model(view, model[property]);
          delete meta.error;
        } catch (e) {
          meta.error = e;
        }
      }
    };
  } else {
    return {
      get: function () {
        return model[property];
      },

      set: function (value) {
        model[property] = value;
      }
    };
  }
};

exports.binding = makeBinding;
exports.html.binding = makeBinding;
exports.html.meta = bindingMeta;

function rawHtml() {
  if (arguments.length == 2) {
    var selector = arguments[0];
    var html = arguments[1];
    var options = {innerHTML: html};
    return exports.html(selector, options);
  } else {
    var selector = arguments[0];
    var options = arguments[1];
    var html = arguments[2];
    options.innerHTML = html;
    return exports.html(selector, options);
  }
}

exports.html.rawHtml = rawHtml;

function generateClassName(obj) {
  if (typeof(obj) == 'object') {
    if (obj instanceof Array) {
      return obj.join(' ') || undefined;
    } else {
      return Object.keys(obj).filter(function (key) {
        return obj[key];
      }).join(' ') || undefined;
    }
  } else {
    return obj;
  }
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./coerceToVdom":4,"./domComponent":6,"./meta":8,"./simplePromise":44,"virtual-dom/h":11}],44:[function(require,module,exports){
function SimplePromise () {
  this.listeners = [];
}

SimplePromise.prototype.fulfill = function (value) {
  if (!this.isFulfilled) {
    this.isFulfilled = true;
    this.value = value;
    this.listeners.forEach(function (listener) {
      listener();
    });
  }
};

SimplePromise.prototype.then = function (success) {
  if (this.isFulfilled) {
    var self = this;
    setTimeout(function () {
      success(self.value);
    });
  } else {
    this.listeners.push(success);
  }
};

module.exports = function () {
  return new SimplePromise();
};

},{}],45:[function(require,module,exports){
var domComponent = require('./domComponent');
var VText = require("virtual-dom/vnode/vtext.js")

function WindowWidget(attributes, vdom, refreshFunction) {
  this.attributes = attributes;
  this.vdom = vdom || new VText('');
  this.component = domComponent();

  var self = this;
  this.cache = {};
  Object.keys(this.attributes).forEach(function (key) {
    self.cache[key] = refreshFunction(self.attributes[key]);
  });
}

function applyAttribute(attributes, name, element) {
  if (/^on/.test(name)) {
    element.addEventListener(name.substr(2), this[name]);
  }
}

WindowWidget.prototype.type = 'Widget';

WindowWidget.prototype.init = function () {
  applyPropertyDiffs(window, {}, this.attributes, {}, this.cache);
  return this.component.create(this.vdom);
};

function uniq(array) {
  var sortedArray = array.slice();
  sortedArray.sort();

  var last;

  for(var n = 0; n < sortedArray.length;) {
    var current = sortedArray[n];

    if (last === current) {
      sortedArray.splice(n, 1);
    } else {
      n++;
    }
    last = current;
  }

  return sortedArray;
}

function applyPropertyDiffs(element, previous, current, previousCache, currentCache) {
  uniq(Object.keys(previous).concat(Object.keys(current))).forEach(function (key) {
    if (/^on/.test(key)) {
      var event = key.slice(2);

      var prev = previous[key];
      var curr = current[key];
      var refreshPrev = previousCache[key];
      var refreshCurr = currentCache[key];

      if (prev !== undefined && curr === undefined) {
        element.removeEventListener(event, refreshPrev);
      } else if (prev !== undefined && curr !== undefined && prev !== curr) {
        element.removeEventListener(event, refreshPrev);
        element.addEventListener(event, refreshCurr);
      } else if (prev === undefined && curr !== undefined) {
        element.addEventListener(event, refreshCurr);
      }
    }
  });
}

WindowWidget.prototype.update = function (previous) {
  var self = this;
  applyPropertyDiffs(window, previous.attributes, this.attributes, previous.cache, this.cache);
  this.component = previous.component;
  return this.component.update(this.vdom);
};

WindowWidget.prototype.destroy = function () {
  applyPropertyDiffs(window, this.attributes, {}, this.cache, {});
  this.component.destroy();
};

module.exports = function (attributes, vdom, refreshFunction) {
  return new WindowWidget(attributes, vdom, refreshFunction);
};

},{"./domComponent":6,"virtual-dom/vnode/vtext.js":39}],46:[function(require,module,exports){

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiYXBwLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEtcm91dGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEtcm91dGVyL25vZGVfbW9kdWxlcy9yb3V0aXNtL3NyYy9yb3V0aXNtLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvY29lcmNlVG9WZG9tLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvY29tcG9uZW50LmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvZG9tQ29tcG9uZW50LmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9tZXRhLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2RpZmYuanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vaC5qcyIsIm5vZGVfbW9kdWxlcy9wbGFzdGlxL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvYnJvd3Nlci1zcGxpdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wbGFzdGlxL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvZXYtc3RvcmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL2V2LXN0b3JlL25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy9ldi1zdG9yZS9ub2RlX21vZHVsZXMvaW5kaXZpZHVhbC9vbmUtdmVyc2lvbi5qcyIsIm5vZGVfbW9kdWxlcy9wbGFzdGlxL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvZ2xvYmFsL2RvY3VtZW50LmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy9pcy1vYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL3gtaXMtYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vcGF0Y2guanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmRvbS9hcHBseS1wcm9wZXJ0aWVzLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vY3JlYXRlLWVsZW1lbnQuanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmRvbS9kb20taW5kZXguanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmRvbS9wYXRjaC1vcC5qcyIsIm5vZGVfbW9kdWxlcy9wbGFzdGlxL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92ZG9tL3BhdGNoLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vdXBkYXRlLXdpZGdldC5qcyIsIm5vZGVfbW9kdWxlcy9wbGFzdGlxL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92aXJ0dWFsLWh5cGVyc2NyaXB0L2hvb2tzL2V2LWhvb2suanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmlydHVhbC1oeXBlcnNjcmlwdC9ob29rcy9zb2Z0LXNldC1ob29rLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmlydHVhbC1oeXBlcnNjcmlwdC9wYXJzZS10YWcuanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9ub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdm5vZGUvaGFuZGxlLXRodW5rLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL2lzLXRodW5rLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL2lzLXZob29rLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL2lzLXZub2RlLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL2lzLXZ0ZXh0LmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL2lzLXdpZGdldC5qcyIsIm5vZGVfbW9kdWxlcy9wbGFzdGlxL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92ZXJzaW9uLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL3Zub2RlLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL3ZwYXRjaC5qcyIsIm5vZGVfbW9kdWxlcy9wbGFzdGlxL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92dGV4dC5qcyIsIm5vZGVfbW9kdWxlcy9wbGFzdGlxL25vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92dHJlZS9kaWZmLXByb3BzLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvbm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Z0cmVlL2RpZmYuanMiLCJub2RlX21vZHVsZXMvcGxhc3RpcS9vbGRiaW5kLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvcmVuZGVyaW5nLmpzIiwibm9kZV9tb2R1bGVzL3BsYXN0aXEvc2ltcGxlUHJvbWlzZS5qcyIsIm5vZGVfbW9kdWxlcy9wbGFzdGlxL3dpbmRvd0V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM2lCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDam1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgcGxhc3RpcSA9IHJlcXVpcmUoJ3BsYXN0aXEnKTtcbnZhciByb3V0ZXIgPSByZXF1aXJlKCdwbGFzdGlxLXJvdXRlcicpO1xudmFyIGggPSBwbGFzdGlxLmh0bWw7XG5cbnJvdXRlci5zdGFydCh7aGlzdG9yeTogcm91dGVyLmhhc2h9KTtcblxudmFyIHJvdXRlcyA9IHtcbiAgYWxsOiByb3V0ZXIucm91dGUoJy8nKSxcbiAgZmlsdGVyOiByb3V0ZXIucm91dGUoJy86ZmlsdGVyJylcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUFwcCgpIHtcbiAgcmV0dXJuIHtcbiAgICB0b2RvczogW10sXG5cbiAgICBmaWx0ZXJzOiB7XG4gICAgICBhbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuXG4gICAgICBhY3RpdmU6IGZ1bmN0aW9uICh0b2RvKSB7XG4gICAgICAgIHJldHVybiAhdG9kby5jb21wbGV0ZWQ7XG4gICAgICB9LFxuXG4gICAgICBjb21wbGV0ZWQ6IGZ1bmN0aW9uICh0b2RvKSB7XG4gICAgICAgIHJldHVybiB0b2RvLmNvbXBsZXRlZDtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVuZGVyOiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGZ1bmN0aW9uIGFkZFRvZG8oZXYpIHtcbiAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBzZWxmLnRvZG9zLnB1c2goe1xuICAgICAgICAgIHRpdGxlOiBzZWxmLnRvZG9UaXRsZSxcbiAgICAgICAgICBjb21wbGV0ZWQ6IGZhbHNlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNlbGYudG9kb1RpdGxlID0gJyc7XG4gICAgICB9XG5cbiAgICAgIHZhciByZW1haW5pbmcgPSB0aGlzLnRvZG9zLmZpbHRlcihmdW5jdGlvbiAodG9kbykge1xuICAgICAgICByZXR1cm4gIXRvZG8uY29tcGxldGVkO1xuICAgICAgfSk7XG5cbiAgICAgIHZhciByZW1haW5pbmdDb3VudCA9IHJlbWFpbmluZy5sZW5ndGg7XG4gICAgICB2YXIgY29tcGxldGVkQ291bnQgPSB0aGlzLnRvZG9zLmxlbmd0aCAtIHJlbWFpbmluZ0NvdW50O1xuXG4gICAgICBmdW5jdGlvbiBjbGVhckNvbXBsZXRlZFRvZG9zKCkge1xuICAgICAgICBzZWxmLnRvZG9zID0gcmVtYWluaW5nO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiByZW5kZXJGaWx0ZXIobmFtZSwgdGl0bGUpIHtcbiAgICAgICAgdmFyIHJvdXRlID0gbmFtZSA9PSAnYWxsJ1xuICAgICAgICAgID8gcm91dGVzLmFsbCgpXG4gICAgICAgICAgOiByb3V0ZXMuZmlsdGVyKHtmaWx0ZXI6IG5hbWV9KTtcblxuICAgICAgICByZXR1cm4gaCgnbGknLCByb3V0ZS5saW5rKHtjbGFzczoge3NlbGVjdGVkOiByb3V0ZS5hY3RpdmV9fSwgdGl0bGUpKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gZWl0aGVyUm91dGUoZm4pIHtcbiAgICAgICAgcmV0dXJuIHJvdXRlcy5hbGwoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBmbih7ZmlsdGVyOiAnYWxsJ30pO1xuICAgICAgICB9KSB8fCByb3V0ZXMuZmlsdGVyKGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICByZXR1cm4gZm4ocGFyYW1zKTtcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGVpdGhlclJvdXRlKGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgdmFyIGZpbHRlck5hbWUgPSBwYXJhbXMuZmlsdGVyIHx8ICdhbGwnO1xuICAgICAgICB2YXIgZmlsdGVyID0gc2VsZi5maWx0ZXJzW2ZpbHRlck5hbWVdO1xuXG4gICAgICAgIHJldHVybiBoKCdkaXYnLFxuICAgICAgICAgIGgoJ3NlY3Rpb24udG9kb2FwcCcsXG4gICAgICAgICAgICBoKCdoZWFkZXIuaGVhZGVyJyxcbiAgICAgICAgICAgICAgaCgnaDEnLCAndG9kb3MnKSxcbiAgICAgICAgICAgICAgaCgnZm9ybS50b2RvLWZvcm0nLCB7b25zdWJtaXQ6IGFkZFRvZG99LFxuICAgICAgICAgICAgICAgIGgoJ2lucHV0Lm5ldy10b2RvJywge3R5cGU6ICd0ZXh0JywgcGxhY2Vob2xkZXI6ICdXaGF0IG5lZWRzIHRvIGJlIGRvbmU/JywgYmluZGluZzogW3NlbGYsICd0b2RvVGl0bGUnXX0pXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBzZWxmLnRvZG9zLmxlbmd0aFxuICAgICAgICAgICAgICA/IFtcbiAgICAgICAgICAgICAgICAgIGgoJ3NlY3Rpb24ubWFpbicsXG4gICAgICAgICAgICAgICAgICAgIGgoJ2lucHV0LnRvZ2dsZS1hbGwnLCB7dHlwZTogJ2NoZWNrYm94JywgYmluZGluZzogW3NlbGYsICdhbGxDaGVja2VkJ119KSxcbiAgICAgICAgICAgICAgICAgICAgaCgnbGFiZWwnLCB7Zm9yOiAndG9nZ2xlLWFsbCd9LCAnTWFyayBhbGwgYXMgY29tcGxldGUnKSxcbiAgICAgICAgICAgICAgICAgICAgaCgndWwudG9kby1saXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLnRvZG9zLm1hcChmdW5jdGlvbiAodG9kbywgdG9kb0luZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBlZGl0VG9kbygpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdG9kby5lZGl0ZWRUaXRsZSA9IHRvZG8udGl0bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZWRpdGVkVG9kbyA9IHRvZG87XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGZpbmlzaEVkaXRpbmdUb2RvKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldi50eXBlID09ICdzdWJtaXQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5lZGl0ZWRUb2RvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5lZGl0ZWRUb2RvLnRpdGxlID0gc2VsZi5lZGl0ZWRUb2RvLmVkaXRlZFRpdGxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzZWxmLmVkaXRlZFRvZG87XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gaGFuZGxlRXNjYXBlKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldi5rZXlDb2RlID09IDI3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHNlbGYuZWRpdGVkVG9kbztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiByZW1vdmVUb2RvKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnRvZG9zLnNwbGljZSh0b2RvSW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZGVsZXRlZCcsIHRvZG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKHRvZG8pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoKCdsaScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkOiB0b2RvLmNvbXBsZXRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdGluZzogdG9kbyA9PSBzZWxmLmVkaXRlZFRvZG9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2Rpdi52aWV3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGgoJ2lucHV0LnRvZ2dsZScsIHt0eXBlOiAnY2hlY2tib3gnLCBiaW5kaW5nOiBbdG9kbywgJ2NvbXBsZXRlZCddfSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdsYWJlbCcsIHtvbmNsaWNrOiBlZGl0VG9kb30sIHRvZG8udGl0bGUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaCgnYnV0dG9uLmRlc3Ryb3knLCB7b25jbGljazogcmVtb3ZlVG9kb30pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdmb3JtJywge29uc3VibWl0OiBmaW5pc2hFZGl0aW5nVG9kb30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoKCdpbnB1dC5lZGl0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uYmx1cjogZmluaXNoRWRpdGluZ1RvZG8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ua2V5ZG93bjogaGFuZGxlRXNjYXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiaW5kaW5nOiBbdG9kbywgJ2VkaXRlZFRpdGxlJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICAgICBoKCdmb290ZXIuZm9vdGVyJyxcbiAgICAgICAgICAgICAgICAgICAgaCgnc3Bhbi50b2RvLWNvdW50JyxcbiAgICAgICAgICAgICAgICAgICAgICBoKCdzdHJvbmcnLCByZW1haW5pbmdDb3VudCksICcgJyxcbiAgICAgICAgICAgICAgICAgICAgICByZW1haW5pbmdDb3VudCA9PSAxXG4gICAgICAgICAgICAgICAgICAgICAgICA/ICdpdGVtIGxlZnQnXG4gICAgICAgICAgICAgICAgICAgICAgICA6ICdpdGVtcyBsZWZ0J1xuICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICBoKCd1bC5maWx0ZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgICByZW5kZXJGaWx0ZXIoJ2FsbCcsICdBbGwnKSxcbiAgICAgICAgICAgICAgICAgICAgICByZW5kZXJGaWx0ZXIoJ2FjdGl2ZScsICdBY3RpdmUnKSxcbiAgICAgICAgICAgICAgICAgICAgICByZW5kZXJGaWx0ZXIoJ2NvbXBsZXRlZCcsICdDb21wbGV0ZWQnKVxuICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWRDb3VudFxuICAgICAgICAgICAgICAgICAgICAgID8gaCgnYnV0dG9uLmNsZWFyLWNvbXBsZXRlZCcsIHtvbmNsaWNrOiBjbGVhckNvbXBsZXRlZFRvZG9zfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NsZWFyIGNvbXBsZXRlZCAnICsgY29tcGxldGVkQ291bnRcbiAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICA6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgOiB1bmRlZmluZWRcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59XG5cbnBsYXN0aXEuYXBwZW5kKGRvY3VtZW50LmJvZHksIGNyZWF0ZUFwcCgpKTtcbiIsInZhciByb3V0aXNtID0gcmVxdWlyZSgncm91dGlzbScpO1xudmFyIHBsYXN0aXEgPSByZXF1aXJlKCdwbGFzdGlxJyk7XG52YXIgaCA9IHBsYXN0aXEuaHRtbDtcbnZhciByZWZyZXNoO1xuXG5mdW5jdGlvbiBSb3V0ZXMoKSB7XG4gIHRoaXMucm91dGVzID0gW107XG4gIHRoaXMucm91dGVzQ2hhbmdlZCA9IGZhbHNlO1xufVxuXG5Sb3V0ZXMucHJvdG90eXBlLnJlY29nbmlzZSA9IGZ1bmN0aW9uIChwYXRobmFtZSkge1xuICBpZiAodGhpcy5yb3V0ZXNDaGFuZ2VkKSB7XG4gICAgdGhpcy5jb21waWxlZFJvdXRlcyA9IHJvdXRpc20uY29tcGlsZSh0aGlzLnJvdXRlcyk7XG4gICAgdGhpcy5yb3V0ZXNDaGFuZ2VkID0gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdGhpcy5jb21waWxlZFJvdXRlcy5yZWNvZ25pc2UocGF0aG5hbWUpO1xufTtcblxuUm91dGVzLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAocGF0dGVybikge1xuICB2YXIgcm91dGUgPSB7cGF0dGVybjogcGF0dGVybn07XG4gIHRoaXMucm91dGVzLnB1c2goe3BhdHRlcm46IHBhdHRlcm4sIHJvdXRlOiByb3V0ZX0pO1xuICB0aGlzLnJvdXRlc0NoYW5nZWQgPSB0cnVlO1xuICByZXR1cm4gcm91dGU7XG59O1xuXG5mdW5jdGlvbiBSb3V0ZXIoKSB7XG4gIHRoaXMucm91dGVzID0gbmV3IFJvdXRlcygpO1xufVxuXG5Sb3V0ZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKGhpc3RvcnkpIHtcbiAgdGhpcy5oaXN0b3J5ID0gaGlzdG9yeTtcbiAgdGhpcy5oaXN0b3J5LnN0YXJ0KCk7XG4gIHRoaXMuc3RhcnRlZCA9IHRydWU7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLnN0YXJ0ZWQpIHtcbiAgICB0aGlzLmhpc3Rvcnkuc3RvcCgpO1xuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzKTtcbiAgICBmb3IgKHZhciBuID0gMDsgbiA8IGtleXMubGVuZ3RoOyBuKyspIHtcbiAgICAgIGlmIChrZXlzW25dICE9ICdyb3V0ZXMnKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzW2tleXNbbl1dO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuUm91dGVyLnByb3RvdHlwZS5pc05vdEZvdW5kID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5jdXJyZW50Um91dGUuaXNOb3RGb3VuZCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRSb3V0ZTtcbiAgfVxufTtcblxuUm91dGVyLnByb3RvdHlwZS5tYWtlQ3VycmVudFJvdXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbG9jYXRpb24gPSB0aGlzLmhpc3RvcnkubG9jYXRpb24oKTtcbiAgdmFyIGhyZWYgPSBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaDtcblxuICBpZiAoIXRoaXMuY3VycmVudFJvdXRlIHx8IHRoaXMuY3VycmVudFJvdXRlLmhyZWYgIT0gaHJlZikge1xuICAgIHZhciByb3V0ZVJlY29nbmlzZWQgPSB0aGlzLnJvdXRlcy5yZWNvZ25pc2UobG9jYXRpb24ucGF0aG5hbWUpO1xuXG4gICAgaWYgKHJvdXRlUmVjb2duaXNlZCkge1xuICAgICAgdmFyIHNlYXJjaCA9IGxvY2F0aW9uLnNlYXJjaCAmJiBwYXJzZVNlYXJjaChsb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgdmFyIHBhcmFtQXJyYXkgPSBzZWFyY2hcbiAgICAgICAgPyBzZWFyY2guY29uY2F0KHJvdXRlUmVjb2duaXNlZC5wYXJhbXMpXG4gICAgICAgIDogcm91dGVSZWNvZ25pc2VkLnBhcmFtcztcblxuICAgICAgdmFyIHBhcmFtcyA9IGFzc29jaWF0aXZlQXJyYXlUb09iamVjdChwYXJhbUFycmF5KTtcblxuICAgICAgdmFyIGV4cGFuZGVkVXJsID0gZXhwYW5kKHJvdXRlUmVjb2duaXNlZC5yb3V0ZS5wYXR0ZXJuLCBwYXJhbXMpO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICBpZiAodGhpcy5jdXJyZW50Um91dGUgJiYgdGhpcy5jdXJyZW50Um91dGUub25kZXBhcnR1cmUpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50Um91dGUub25kZXBhcnR1cmUoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jdXJyZW50Um91dGUgPSB7XG4gICAgICAgIHJvdXRlOiByb3V0ZVJlY29nbmlzZWQucm91dGUsXG4gICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICBocmVmOiBocmVmLFxuICAgICAgICBleHBhbmRlZFVybDogZXhwYW5kZWRVcmwsXG4gICAgICAgIHJlcGxhY2U6IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICB2YXIgdXJsID0gZXhwYW5kKHRoaXMucm91dGUucGF0dGVybiwgcGFyYW1zKTtcbiAgICAgICAgICB0aGlzLnBhcmFtcyA9IHBhcmFtcztcbiAgICAgICAgICBzZWxmLnJlcGxhY2UodXJsKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5jdXJyZW50Um91dGUgPSB7XG4gICAgICAgIGlzTm90Rm91bmQ6IHRydWUsXG4gICAgICAgIGhyZWY6IGhyZWZcbiAgICAgIH07XG4gICAgfVxuICB9XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLnNldHVwUmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICBpZiAoaC5jdXJyZW50UmVuZGVyICYmICFoLmN1cnJlbnRSZW5kZXIucm91dGVyRXN0YWJsaXNoZWQpIHtcbiAgICBoLmN1cnJlbnRSZW5kZXIucm91dGVyRXN0YWJsaXNoZWQgPSB0cnVlO1xuXG4gICAgdGhpcy5sYXN0SHJlZiA9IHRoaXMuY3VycmVudEhyZWY7XG5cbiAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmhpc3RvcnkubG9jYXRpb24oKTtcbiAgICB2YXIgaHJlZiA9IGxvY2F0aW9uLnBhdGhuYW1lICsgbG9jYXRpb24uc2VhcmNoO1xuICAgIHRoaXMuY3VycmVudEhyZWYgPSBocmVmO1xuXG4gICAgdGhpcy5faXNOZXdIcmVmID0gdGhpcy5sYXN0SHJlZiAhPSB0aGlzLmN1cnJlbnRIcmVmO1xuXG4gICAgdGhpcy5tYWtlQ3VycmVudFJvdXRlKCk7XG4gIH1cbn07XG5cblJvdXRlci5wcm90b3R5cGUuaXNOZXdIcmVmID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5faXNOZXdIcmVmO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5pc0N1cnJlbnRSb3V0ZSA9IGZ1bmN0aW9uIChyb3V0ZSkge1xuICB0aGlzLm1ha2VDdXJyZW50Um91dGUoKTtcblxuICBpZiAodGhpcy5jdXJyZW50Um91dGUucm91dGUgPT09IHJvdXRlKSB7XG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFJvdXRlO1xuICB9XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChwYXR0ZXJuKSB7XG4gIHJldHVybiB0aGlzLnJvdXRlcy5hZGQocGF0dGVybik7XG59O1xuXG5Sb3V0ZXIucHJvdG90eXBlLnB1c2hPclJlcGxhY2UgPSBmdW5jdGlvbiAocHVzaFJlcGxhY2UsIHVybCwgb3B0aW9ucykge1xuICBpZiAoKG9wdGlvbnMgJiYgb3B0aW9ucy5mb3JjZSkgfHwgIXRoaXMuY3VycmVudFJvdXRlIHx8IHRoaXMuY3VycmVudFJvdXRlLmV4cGFuZGVkVXJsICE9IHVybCkge1xuICAgIHRoaXMuaGlzdG9yeVtwdXNoUmVwbGFjZV0odXJsKTtcbiAgICB2YXIgbG9jYXRpb24gPSB0aGlzLmhpc3RvcnkubG9jYXRpb24oKTtcblxuICAgIGlmICh0aGlzLmN1cnJlbnRSb3V0ZS5vbmRlcGFydHVyZSkge1xuICAgICAgdGhpcy5jdXJyZW50Um91dGUub25kZXBhcnR1cmUoKTtcbiAgICB9XG5cbiAgICBpZiAocmVmcmVzaCkge1xuICAgICAgcmVmcmVzaCgpO1xuICAgIH1cbiAgfVxufTtcblxuUm91dGVyLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICB0aGlzLnB1c2hPclJlcGxhY2UoJ3B1c2gnLCB1cmwsIG9wdGlvbnMpO1xufTtcblxuUm91dGVyLnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICB0aGlzLnB1c2hPclJlcGxhY2UoJ3JlcGxhY2UnLCB1cmwsIG9wdGlvbnMpO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlUm91dGVyKCkge1xuICByZXR1cm4gbmV3IFJvdXRlcigpO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVSZWdleChwYXR0ZXJuKSB7XG4gIHJldHVybiBwYXR0ZXJuLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xufVxuXG52YXIgc3BsYXRWYXJpYWJsZVJlZ2V4ID0gLyhcXDooW2EtelxcLV9dKylcXFxcXFwqKS9pZztcbnZhciB2YXJpYWJsZVJlZ2V4ID0gLyg6KFstYS16X10rKSkvaWc7XG5cbmZ1bmN0aW9uIGNvbXBpbGVQYXR0ZXJuKHBhdHRlcm4pIHtcbiAgcmV0dXJuIGVzY2FwZVJlZ2V4KHBhdHRlcm4pXG4gICAgLnJlcGxhY2Uoc3BsYXRWYXJpYWJsZVJlZ2V4LCBcIiguKylcIilcbiAgICAucmVwbGFjZSh2YXJpYWJsZVJlZ2V4LCBcIihbXlxcL10rKVwiKTtcbn1cblxuZnVuY3Rpb24gcHJlcGFyZVBhdHRlcm4ocGF0dGVybikge1xuICB2YXIgbWF0Y2g7XG4gIHZhciB2YXJpYWJsZVJlZ2V4ID0gbmV3IFJlZ0V4cCgnKDooWy1hLXpfXSspKScsICdpZycpO1xuICB2YXIgdmFyaWFibGVzID0gW107XG5cbiAgd2hpbGUgKG1hdGNoID0gdmFyaWFibGVSZWdleC5leGVjKHBhdHRlcm4pKSB7XG4gICAgdmFyaWFibGVzLnB1c2gobWF0Y2hbMl0pO1xuICB9XG5cbiAgdmFyIHBhdHRlcm5SZWdleCA9IG5ldyBSZWdFeHAoJ14nICsgY29tcGlsZVBhdHRlcm4ocGF0dGVybikpO1xuXG4gIHJldHVybiB7XG4gICAgcmVnZXg6IHBhdHRlcm5SZWdleCxcbiAgICB2YXJpYWJsZXM6IHZhcmlhYmxlc1xuICB9O1xufVxuXG5mdW5jdGlvbiBtYXRjaFVuZGVyKHBhdHRlcm4pIHtcbiAgdmFyIHBhdHRlcm5WYXJpYWJsZXMgPSBwcmVwYXJlUGF0dGVybihwYXR0ZXJuKTtcblxuICByZXR1cm4gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICB2YXIgbWF0Y2ggPSBwYXR0ZXJuVmFyaWFibGVzLnJlZ2V4LmV4ZWMocGF0aCk7XG5cbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIHZhciBwYXJhbXMgPSB7fTtcblxuICAgICAgZm9yICh2YXIgbiA9IDE7IG4gPCBtYXRjaC5sZW5ndGg7IG4rKykge1xuICAgICAgICBwYXJhbXNbcGF0dGVyblZhcmlhYmxlcy52YXJpYWJsZXNbbiAtIDFdXSA9IG1hdGNoW25dO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcGFyYW1zO1xuICAgIH1cbiAgfTtcbn1cblxudmFyIHJvdXRlciA9IGNyZWF0ZVJvdXRlcigpO1xuXG5mdW5jdGlvbiBwYXJzZVNlYXJjaChzZWFyY2gpIHtcbiAgcmV0dXJuIHNlYXJjaCAmJiBzZWFyY2guc3Vic3RyaW5nKDEpLnNwbGl0KCcmJykubWFwKGZ1bmN0aW9uIChwYXJhbSkge1xuICAgIHJldHVybiBwYXJhbS5zcGxpdCgnPScpLm1hcChkZWNvZGVVUklDb21wb25lbnQpO1xuICB9KTtcbn1cblxudmFyIHBvcHN0YXRlTGlzdGVuZXI7XG5cbmV4cG9ydHMuc3RhcnQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAoIXJvdXRlcikge1xuICAgIHJvdXRlciA9IGNyZWF0ZVJvdXRlcigpO1xuICB9XG4gIHJvdXRlci5zdGFydCgob3B0aW9ucyAmJiBvcHRpb25zLmhpc3RvcnkpIHx8IGV4cG9ydHMuaGlzdG9yeUFwaSk7XG59O1xuXG5leHBvcnRzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gIHJvdXRlci5zdG9wKCk7XG59O1xuXG5leHBvcnRzLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICByb3V0ZXIuc3RvcCgpO1xuICByb3V0ZXIgPSB1bmRlZmluZWQ7XG59O1xuXG5leHBvcnRzLnJvdXRlID0gZnVuY3Rpb24gKHBhdHRlcm4pIHtcbiAgdmFyIHJvdXRlID0gcm91dGVyLmFkZChwYXR0ZXJuKTtcblxuICBmdW5jdGlvbiByb3V0ZUZuIChwYXJhbUJpbmRpbmdzLCByZW5kZXIpIHtcbiAgICBpZiAodHlwZW9mIHBhcmFtQmluZGluZ3MgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJlbmRlciA9IHBhcmFtQmluZGluZ3M7XG4gICAgICBwYXJhbUJpbmRpbmdzID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICghcmVuZGVyKSB7XG4gICAgICB2YXIgcGFyYW1zID0gcGFyYW1CaW5kaW5ncyB8fCB7fTtcbiAgICAgIHZhciB1cmwgPSBleHBhbmQocGF0dGVybiwgcGFyYW1zKTtcblxuICAgICAgdmFyIGN1cnJlbnRSb3V0ZSA9IHJvdXRlci5zdGFydGVkICYmIHJvdXRlci5pc0N1cnJlbnRSb3V0ZShyb3V0ZSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChldikge1xuICAgICAgICAgIGlmIChldikge1xuICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByb3V0ZXIucHVzaCh1cmwpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlcGxhY2U6IGZ1bmN0aW9uIChldikge1xuICAgICAgICAgIGlmIChldikge1xuICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByb3V0ZXIucmVwbGFjZSh1cmwpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGFjdGl2ZTogY3VycmVudFJvdXRlICYmIGN1cnJlbnRSb3V0ZS5leHBhbmRlZFVybCA9PSB1cmwsXG5cbiAgICAgICAgaHJlZjogdXJsLFxuXG4gICAgICAgIGE6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5saW5rLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbGluazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBvcHRpb25zO1xuICAgICAgICAgIGlmIChhcmd1bWVudHNbMF0gJiYgYXJndW1lbnRzWzBdLmNvbnN0cnVjdG9yID09IE9iamVjdCkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgIGNvbnRlbnQgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICBjb250ZW50ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBvcHRpb25zLmhyZWYgPSB1cmw7XG4gICAgICAgICAgb3B0aW9ucy5vbmNsaWNrID0gdGhpcy5wdXNoLmJpbmQodGhpcyk7XG5cbiAgICAgICAgICByZXR1cm4gaC5hcHBseShoLCBbJ2EnLCBvcHRpb25zXS5jb25jYXQoY29udGVudCkpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIXJvdXRlci5zdGFydGVkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInJvdXRlciBub3Qgc3RhcnRlZCB5ZXQsIHN0YXJ0IHdpdGggcmVxdWlyZSgncGxhc3RpcS1yb3V0ZXInKS5zdGFydChbaGlzdG9yeV0pXCIpO1xuICAgICAgfVxuXG4gICAgICByb3V0ZXIuc2V0dXBSZW5kZXIoKTtcblxuICAgICAgcmVmcmVzaCA9IGgucmVmcmVzaDtcbiAgICAgIHZhciBjdXJyZW50Um91dGUgPSByb3V0ZXIuaXNDdXJyZW50Um91dGUocm91dGUpO1xuICAgICAgdmFyIGlzTmV3ID0gcm91dGVyLmlzTmV3SHJlZigpO1xuXG4gICAgICBpZiAoY3VycmVudFJvdXRlKSB7XG4gICAgICAgIGlmIChwYXJhbUJpbmRpbmdzKSB7XG4gICAgICAgICAgdmFyIG9uYXJyaXZhbCA9IHBhcmFtQmluZGluZ3Mub25hcnJpdmFsICYmIGgucmVmcmVzaGlmeShwYXJhbUJpbmRpbmdzLm9uYXJyaXZhbCwge3JlZnJlc2g6ICdwcm9taXNlJ30pO1xuICAgICAgICAgIGRlbGV0ZSBwYXJhbUJpbmRpbmdzLm9uYXJyaXZhbDtcbiAgICAgICAgICBjdXJyZW50Um91dGUub25kZXBhcnR1cmUgPSBwYXJhbUJpbmRpbmdzLm9uZGVwYXJ0dXJlO1xuICAgICAgICAgIGRlbGV0ZSBwYXJhbUJpbmRpbmdzLm9uZGVwYXJ0dXJlO1xuXG4gICAgICAgICAgaWYgKGlzTmV3KSB7XG4gICAgICAgICAgICBzZXRQYXJhbUJpbmRpbmdzKGN1cnJlbnRSb3V0ZS5wYXJhbXMsIHBhcmFtQmluZGluZ3MpO1xuXG4gICAgICAgICAgICBpZiAob25hcnJpdmFsKSB7XG4gICAgICAgICAgICAgIG9uYXJyaXZhbChwYXJhbXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgbmV3UGFyYW1zID0gZ2V0UGFyYW1CaW5kaW5ncyhjdXJyZW50Um91dGUucGFyYW1zLCBwYXJhbUJpbmRpbmdzKTtcbiAgICAgICAgICAgIGlmIChuZXdQYXJhbXMpIHtcbiAgICAgICAgICAgICAgY3VycmVudFJvdXRlLnJlcGxhY2UobmV3UGFyYW1zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVuZGVyKGN1cnJlbnRSb3V0ZS5wYXJhbXMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciBfdW5kZXJSZWdFeHA7XG4gIGZ1bmN0aW9uIHVuZGVyUmVnRXhwKCkge1xuICAgIGlmICghX3VuZGVyUmVnRXhwKSB7XG4gICAgICBfdW5kZXJSZWdFeHAgPSBtYXRjaFVuZGVyKHBhdHRlcm4pO1xuICAgIH1cblxuICAgIHJldHVybiBfdW5kZXJSZWdFeHA7XG4gIH1cblxuICByb3V0ZUZuLnVuZGVyID0gZnVuY3Rpb24gKF9wYXJhbUJpbmRpbmdzLCBfZm4pIHtcbiAgICB2YXIgcGFyYW1CaW5kaW5ncywgZm47XG5cbiAgICBpZiAodHlwZW9mIF9wYXJhbUJpbmRpbmdzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBmbiA9IF9wYXJhbUJpbmRpbmdzO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJhbUJpbmRpbmdzID0gX3BhcmFtQmluZGluZ3M7XG4gICAgICBmbiA9IF9mbjtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0gdW5kZXJSZWdFeHAoKShyb3V0ZXIuaGlzdG9yeS5sb2NhdGlvbigpLnBhdGhuYW1lKTtcblxuICAgIGlmIChwYXJhbXMgJiYgcGFyYW1CaW5kaW5ncyAmJiBmbikge1xuICAgICAgcm91dGVyLnNldHVwUmVuZGVyKCk7XG5cbiAgICAgIGlmIChyb3V0ZXIuaXNOZXdIcmVmKCkpIHtcbiAgICAgICAgc2V0UGFyYW1CaW5kaW5ncyhwYXJhbXMsIHBhcmFtQmluZGluZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG5ld1BhcmFtcyA9IGdldFBhcmFtQmluZGluZ3Mocm91dGVyLmN1cnJlbnRSb3V0ZS5wYXJhbXMsIHBhcmFtQmluZGluZ3MpO1xuICAgICAgICBpZiAobmV3UGFyYW1zKSB7XG4gICAgICAgICAgcm91dGVyLmN1cnJlbnRSb3V0ZS5yZXBsYWNlKG5ld1BhcmFtcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZm4pIHtcbiAgICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgcmV0dXJuIGZuKHBhcmFtcyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFjdGl2ZTogISFwYXJhbXNcbiAgICAgIH07XG4gICAgfVxuICB9O1xuXG4gIHJvdXRlRm4ucGF0dGVybiA9IHBhdHRlcm47XG4gIFxuICByZXR1cm4gcm91dGVGbjtcbn07XG5cbmZ1bmN0aW9uIHNldFBhcmFtQmluZGluZ3MocGFyYW1zLCBwYXJhbUJpbmRpbmdzKSB7XG4gIHZhciBwYXJhbUtleXMgPSBPYmplY3Qua2V5cyhwYXJhbXMpO1xuICBmb3IgKHZhciBuID0gMDsgbiA8IHBhcmFtS2V5cy5sZW5ndGg7IG4rKykge1xuICAgIHZhciBwYXJhbSA9IHBhcmFtS2V5c1tuXTtcbiAgICB2YXIgdmFsdWUgPSBwYXJhbXNbcGFyYW1dO1xuXG4gICAgdmFyIHBhcmFtQmluZGluZyA9IHBhcmFtQmluZGluZ3NbcGFyYW1dO1xuICAgIGlmIChwYXJhbUJpbmRpbmcpIHtcbiAgICAgIHZhciBiaW5kaW5nID0gaC5iaW5kaW5nKHBhcmFtQmluZGluZywge3JlZnJlc2g6ICdwcm9taXNlJ30pXG4gICAgICBpZiAoYmluZGluZy5zZXQpIHtcbiAgICAgICAgYmluZGluZy5zZXQodmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRQYXJhbUJpbmRpbmdzKHBhcmFtcywgcGFyYW1CaW5kaW5ncykge1xuICB2YXIgYmluZGluZ3MgPSBPYmplY3Qua2V5cyhwYXJhbUJpbmRpbmdzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHJldHVybiB7XG4gICAgICBrZXk6IGtleSxcbiAgICAgIGJpbmRpbmc6IGguYmluZGluZyhwYXJhbUJpbmRpbmdzW2tleV0pXG4gICAgfTtcbiAgfSk7XG5cbiAgdmFyIGFsbEJpbmRpbmdzSGF2ZUdldHRlcnMgPSAhYmluZGluZ3Muc29tZShmdW5jdGlvbiAoYikge1xuICAgIHJldHVybiAhYi5iaW5kaW5nLmdldDtcbiAgfSk7XG5cbiAgaWYgKGFsbEJpbmRpbmdzSGF2ZUdldHRlcnMpIHtcbiAgICB2YXIgbmV3UGFyYW1zID0ge307XG5cbiAgICB2YXIgcGFyYW1LZXlzID0gT2JqZWN0LmtleXMocGFyYW1zKTtcbiAgICBmb3IodmFyIG4gPSAwOyBuIDwgcGFyYW1LZXlzLmxlbmd0aDsgbisrKSB7XG4gICAgICB2YXIgcGFyYW0gPSBwYXJhbUtleXNbbl07XG4gICAgICBuZXdQYXJhbXNbcGFyYW1dID0gcGFyYW1zW3BhcmFtXTtcbiAgICB9XG5cbiAgICBmb3IodmFyIG4gPSAwOyBuIDwgYmluZGluZ3MubGVuZ3RoOyBuKyspIHtcbiAgICAgIHZhciBiID0gYmluZGluZ3Nbbl07XG4gICAgICBpZiAoYi5iaW5kaW5nLmdldCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBiLmJpbmRpbmcuZ2V0KCk7XG4gICAgICAgIG5ld1BhcmFtc1tiLmtleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3UGFyYW1zO1xuICB9XG59XG5cbmV4cG9ydHMubm90Rm91bmQgPSBmdW5jdGlvbiAocmVuZGVyKSB7XG4gIHZhciBub3RGb3VuZFJvdXRlID0gcm91dGVyLmlzTm90Rm91bmQoKTtcblxuICBpZiAobm90Rm91bmRSb3V0ZSkge1xuICAgIHJldHVybiByZW5kZXIobm90Rm91bmRSb3V0ZS5ocmVmKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gYXNzb2NpYXRpdmVBcnJheVRvT2JqZWN0KGFycmF5KSB7XG4gIHZhciBvID0ge307XG5cbiAgZm9yKHZhciBuID0gMDsgbiA8IGFycmF5Lmxlbmd0aDsgbisrKSB7XG4gICAgdmFyIHBhaXIgPSBhcnJheVtuXTtcbiAgICBvW3BhaXJbMF1dID0gcGFpclsxXTtcbiAgfVxuXG4gIHJldHVybiBvO1xufVxuXG5mdW5jdGlvbiBwYXJhbVRvU3RyaW5nKHApIHtcbiAgaWYgKHAgPT09IHVuZGVmaW5lZCB8fCBwID09PSBudWxsKSB7XG4gICAgcmV0dXJuICcnO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwO1xuICB9XG59XG5cbmZ1bmN0aW9uIGV4cGFuZChwYXR0ZXJuLCBwYXJhbXMpIHtcbiAgdmFyIHBhcmFtc0V4cGFuZGVkID0ge307XG5cbiAgdmFyIHVybCA9IHBhdHRlcm4ucmVwbGFjZSgvOihbYS16X11bYS16MC05X10qKS9naSwgZnVuY3Rpb24gKF8sIGlkKSB7XG4gICAgdmFyIHBhcmFtID0gcGFyYW1zW2lkXTtcbiAgICBwYXJhbXNFeHBhbmRlZFtpZF0gPSB0cnVlO1xuICAgIHJldHVybiBwYXJhbVRvU3RyaW5nKHBhcmFtKTtcbiAgfSk7XG5cbiAgdmFyIHF1ZXJ5ID0gT2JqZWN0LmtleXMocGFyYW1zKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHZhciBwYXJhbSA9IHBhcmFtVG9TdHJpbmcocGFyYW1zW2tleV0pO1xuXG4gICAgaWYgKCFwYXJhbXNFeHBhbmRlZFtrZXldICYmIHBhcmFtICE9ICcnKSB7XG4gICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQocGFyYW0pO1xuICAgIH1cbiAgfSkuZmlsdGVyKGZ1bmN0aW9uIChwYXJhbSkge1xuICAgIHJldHVybiBwYXJhbTtcbiAgfSkuam9pbignJicpO1xuXG4gIGlmIChxdWVyeSkge1xuICAgIHJldHVybiB1cmwgKyAnPycgKyBxdWVyeTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG59XG5cbmV4cG9ydHMuaGlzdG9yeUFwaSA9IHtcbiAgc3RhcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCF0aGlzLmxpc3RlbmluZykge1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgZnVuY3Rpb24oZXYpIHtcbiAgICAgICAgaWYgKHNlbGYuYWN0aXZlKSB7XG4gICAgICAgICAgc2VsZi5wb3BzdGF0ZSA9IHRydWU7XG4gICAgICAgICAgc2VsZi5wb3BzdGF0ZVN0YXRlID0gZXYuc3RhdGU7XG4gICAgICAgICAgaWYgKHJlZnJlc2gpIHtcbiAgICAgICAgICAgIHJlZnJlc2goKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdGhpcy5saXN0ZW5pbmcgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgfSxcbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIC8vIEkgX3RoaW5rXyB0aGlzIGlzIGEgY2hyb21lIGJ1Z1xuICAgIC8vIGlmIHdlIHJlbW92ZUV2ZW50TGlzdGVuZXIgdGhlbiBoaXN0b3J5LmJhY2soKSBkb2Vzbid0IHdvcmtcbiAgICAvLyBDaHJvbWUgVmVyc2lvbiA0My4wLjIzNTcuODEgKDY0LWJpdCksIE1hYyBPUyBYIDEwLjEwLjNcbiAgICAvLyB5ZWFoLi4uXG4gICAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgfSxcbiAgbG9jYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uO1xuICB9LFxuICBwdXNoOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB1cmwpO1xuICB9LFxuICBzdGF0ZTogZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHN0YXRlKTtcbiAgfSxcbiAgcmVwbGFjZTogZnVuY3Rpb24gKHVybCkge1xuICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh1bmRlZmluZWQsIHVuZGVmaW5lZCwgdXJsKTtcbiAgfVxufTtcblxuZXhwb3J0cy5oYXNoID0ge1xuICBzdGFydDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXRoaXMubGlzdGVuaW5nKSB7XG4gICAgICB0aGlzLmhhc2hjaGFuZ2VMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2KSB7XG4gICAgICAgIGlmICghc2VsZi5wdXNoZWQpIHtcbiAgICAgICAgICBpZiAocmVmcmVzaCkge1xuICAgICAgICAgICAgcmVmcmVzaCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzZWxmLnB1c2hlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignaGFzaGNoYW5nZScsIHRoaXMuaGFzaGNoYW5nZUxpc3RlbmVyKTtcbiAgICAgIHRoaXMubGlzdGVuaW5nID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmxpc3RlbmluZyA9IGZhbHNlO1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgdGhpcy5oYXNoY2hhbmdlTGlzdGVuZXIpO1xuICB9LFxuICBsb2NhdGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXRoID0gd2luZG93LmxvY2F0aW9uLmhhc2ggfHwgJyMnO1xuXG4gICAgdmFyIG0gPSAvXiMoLio/KShcXD8uKik/JC8uZXhlYyhwYXRoKTtcblxuICAgIHJldHVybiB7XG4gICAgICBwYXRobmFtZTogJy8nICsgbVsxXSxcbiAgICAgIHNlYXJjaDogbVsyXSB8fCAnJ1xuICAgIH1cbiAgfSxcbiAgcHVzaDogZnVuY3Rpb24gKHVybCkge1xuICAgIHRoaXMucHVzaGVkID0gdHJ1ZTtcbiAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IHVybC5yZXBsYWNlKC9eXFwvLywgJycpO1xuICB9LFxuICBzdGF0ZTogZnVuY3Rpb24gKHN0YXRlKSB7XG4gIH0sXG4gIHJlcGxhY2U6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICByZXR1cm4gdGhpcy5wdXNoKHVybCk7XG4gIH1cbn07XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB2YXJpYWJsZVJlZ2V4LCBzcGxhdFZhcmlhYmxlUmVnZXgsIGVzY2FwZVJlZ2V4LCBhZGRHcm91cEZvclRvLCBhZGRWYXJpYWJsZXNJblRvLCBjb21waWxlLCByZWNvZ25pc2VJbiwgZXh0cmFjdFBhcmFtc0ZvckZyb21BZnRlcjtcbiAgICB2YXJpYWJsZVJlZ2V4ID0gLyhcXDooW2EtelxcLV9dKykpL2dpO1xuICAgIHNwbGF0VmFyaWFibGVSZWdleCA9IC8oXFw6KFthLXpcXC1fXSspXFxcXFxcKikvZ2k7XG4gICAgZXNjYXBlUmVnZXggPSBmdW5jdGlvbihwYXR0ZXJuKSB7XG4gICAgICAgIHJldHVybiBwYXR0ZXJuLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgXCJcXFxcJCZcIik7XG4gICAgfTtcbiAgICBleHBvcnRzLnRhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIHJvd3M7XG4gICAgICAgIHJvd3MgPSBbXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFkZDogZnVuY3Rpb24ocGF0dGVybiwgcm91dGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJvd3MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IHBhdHRlcm4sXG4gICAgICAgICAgICAgICAgICAgIHJvdXRlOiByb3V0ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbXBpbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhwb3J0cy5jb21waWxlKHJvd3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG4gICAgZXhwb3J0cy5jb21waWxlID0gZnVuY3Rpb24ocm91dGVUYWJsZSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBncm91cHMsIHJlZ2V4ZW4sIGdlbjFfaXRlbXMsIGdlbjJfaSwgcm93O1xuICAgICAgICBncm91cHMgPSBbXTtcbiAgICAgICAgcmVnZXhlbiA9IFtdO1xuICAgICAgICBnZW4xX2l0ZW1zID0gcm91dGVUYWJsZTtcbiAgICAgICAgZm9yIChnZW4yX2kgPSAwOyBnZW4yX2kgPCBnZW4xX2l0ZW1zLmxlbmd0aDsgKytnZW4yX2kpIHtcbiAgICAgICAgICAgIHJvdyA9IGdlbjFfaXRlbXNbZ2VuMl9pXTtcbiAgICAgICAgICAgIGFkZEdyb3VwRm9yVG8ocm93LCBncm91cHMpO1xuICAgICAgICAgICAgcmVnZXhlbi5wdXNoKFwiKFwiICsgY29tcGlsZShyb3cucGF0dGVybikgKyBcIilcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlZ2V4OiBuZXcgUmVnRXhwKFwiXihcIiArIHJlZ2V4ZW4uam9pbihcInxcIikgKyBcIikkXCIpLFxuICAgICAgICAgICAgZ3JvdXBzOiBncm91cHMsXG4gICAgICAgICAgICByZWNvZ25pc2U6IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWNvZ25pc2VJbihzZWxmLnJlZ2V4LmV4ZWMoaW5wdXQpIHx8IFtdLCBzZWxmLmdyb3Vwcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfTtcbiAgICBhZGRHcm91cEZvclRvID0gZnVuY3Rpb24ocm93LCBncm91cHMpIHtcbiAgICAgICAgdmFyIGdyb3VwO1xuICAgICAgICBncm91cCA9IHtcbiAgICAgICAgICAgIHJvdXRlOiByb3cucm91dGUsXG4gICAgICAgICAgICBwYXJhbXM6IFtdXG4gICAgICAgIH07XG4gICAgICAgIGdyb3Vwcy5wdXNoKGdyb3VwKTtcbiAgICAgICAgcmV0dXJuIGFkZFZhcmlhYmxlc0luVG8ocm93LnBhdHRlcm4sIGdyb3VwKTtcbiAgICB9O1xuICAgIGFkZFZhcmlhYmxlc0luVG8gPSBmdW5jdGlvbihwYXR0ZXJuLCBncm91cCkge1xuICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgIHdoaWxlIChtYXRjaCA9IHZhcmlhYmxlUmVnZXguZXhlYyhwYXR0ZXJuKSkge1xuICAgICAgICAgICAgZ3JvdXAucGFyYW1zLnB1c2gobWF0Y2hbMl0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgfTtcbiAgICBjb21waWxlID0gZnVuY3Rpb24ocGF0dGVybikge1xuICAgICAgICByZXR1cm4gZXNjYXBlUmVnZXgocGF0dGVybikucmVwbGFjZShzcGxhdFZhcmlhYmxlUmVnZXgsIFwiKC4rKVwiKS5yZXBsYWNlKHZhcmlhYmxlUmVnZXgsIFwiKFteXFxcXC9dKylcIik7XG4gICAgfTtcbiAgICBleHBvcnRzLmNvbXBpbGVQYXR0ZXJuID0gZnVuY3Rpb24ocGF0dGVybikge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBjb21waWxlKHBhdHRlcm4pO1xuICAgIH07XG4gICAgcmVjb2duaXNlSW4gPSBmdW5jdGlvbihtYXRjaCwgZ3JvdXBzKSB7XG4gICAgICAgIHZhciBnLCBpLCBnZW4zX2ZvclJlc3VsdDtcbiAgICAgICAgZyA9IDA7XG4gICAgICAgIGZvciAoaSA9IDI7IGkgPCBtYXRjaC5sZW5ndGg7IGkgPSBpICsgZ3JvdXBzW2cgLSAxXS5wYXJhbXMubGVuZ3RoICsgMSkge1xuICAgICAgICAgICAgZ2VuM19mb3JSZXN1bHQgPSB2b2lkIDA7XG4gICAgICAgICAgICBpZiAoZnVuY3Rpb24oaSkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWF0Y2hbaV0gIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuM19mb3JSZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByb3V0ZTogZ3JvdXBzW2ddLnJvdXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBleHRyYWN0UGFyYW1zRm9yRnJvbUFmdGVyKGdyb3Vwc1tnXSwgbWF0Y2gsIGkpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBnID0gZyArIDE7XG4gICAgICAgICAgICB9KGkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdlbjNfZm9yUmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIGV4dHJhY3RQYXJhbXNGb3JGcm9tQWZ0ZXIgPSBmdW5jdGlvbihncm91cCwgbWF0Y2gsIGkpIHtcbiAgICAgICAgdmFyIHBhcmFtcywgcDtcbiAgICAgICAgcGFyYW1zID0gW107XG4gICAgICAgIGZvciAocCA9IDA7IHAgPCBncm91cC5wYXJhbXMubGVuZ3RoOyBwID0gcCArIDEpIHtcbiAgICAgICAgICAgIHBhcmFtcy5wdXNoKFsgZ3JvdXAucGFyYW1zW3BdLCBkZWNvZGVVUklDb21wb25lbnQobWF0Y2hbcCArIGkgKyAxXSkgXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICB9O1xufSkuY2FsbCh0aGlzKTsiLCJ2YXIgdnRleHQgPSByZXF1aXJlKFwidmlydHVhbC1kb20vdm5vZGUvdnRleHQuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY2hpbGQpIHtcbiAgaWYgKGNoaWxkID09PSB1bmRlZmluZWQgfHwgY2hpbGQgPT09IG51bGwpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKHR5cGVvZihjaGlsZCkgIT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gbmV3IHZ0ZXh0KFN0cmluZyhjaGlsZCkpO1xuICB9IGVsc2UgaWYgKGNoaWxkIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIHJldHVybiBuZXcgdnRleHQoU3RyaW5nKGNoaWxkKSk7XG4gIH0gZWxzZSBpZiAoY2hpbGQgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgIHJldHVybiBuZXcgdnRleHQoY2hpbGQudG9TdHJpbmcoKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGNoaWxkO1xuICB9XG59O1xuIiwidmFyIGggPSByZXF1aXJlKCcuL3JlbmRlcmluZycpLmh0bWw7XG52YXIgVlRleHQgPSByZXF1aXJlKFwidmlydHVhbC1kb20vdm5vZGUvdnRleHQuanNcIilcbnZhciBkb21Db21wb25lbnQgPSByZXF1aXJlKCcuL2RvbUNvbXBvbmVudCcpO1xuXG5mdW5jdGlvbiBDb21wb25lbnRXaWRnZXQoc3RhdGUsIHZkb20pIHtcbiAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICB0aGlzLmtleSA9IHN0YXRlLmtleTtcbiAgaWYgKHR5cGVvZiB2ZG9tID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5yZW5kZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoaC5jdXJyZW50UmVuZGVyKSB7XG4gICAgICAgIGguY3VycmVudFJlbmRlci5ldmVudEhhbmRsZXJXcmFwcGVyID0gc3RhdGUub247XG4gICAgICB9XG4gICAgICByZXR1cm4gdmRvbS5hcHBseSh0aGlzLnN0YXRlLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgdGhpcy5jYW5SZWZyZXNoID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICB2ZG9tID0gdmRvbSB8fCBuZXcgVlRleHQoJycpO1xuICAgIHRoaXMucmVuZGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHZkb207XG4gICAgfVxuICB9XG4gIHRoaXMuY2FjaGVLZXkgPSBzdGF0ZS5jYWNoZUtleTtcbiAgdGhpcy5jb21wb25lbnQgPSBkb21Db21wb25lbnQoKTtcblxuICB2YXIgcmVuZGVyRmluaXNoZWQgPSBoLmN1cnJlbnRSZW5kZXIgJiYgaC5jdXJyZW50UmVuZGVyLmZpbmlzaGVkO1xuICBpZiAocmVuZGVyRmluaXNoZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5hZnRlclJlbmRlciA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgcmVuZGVyRmluaXNoZWQudGhlbihmbik7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmFmdGVyUmVuZGVyID0gZnVuY3Rpb24gKCkge307XG4gIH1cbn1cblxuQ29tcG9uZW50V2lkZ2V0LnByb3RvdHlwZS50eXBlID0gJ1dpZGdldCc7XG5cbkNvbXBvbmVudFdpZGdldC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChzZWxmLnN0YXRlLm9uYmVmb3JlYWRkKSB7XG4gICAgc2VsZi5zdGF0ZS5vbmJlZm9yZWFkZCgpO1xuICB9XG5cbiAgdmFyIHZkb20gPSB0aGlzLnJlbmRlcih0aGlzKTtcbiAgaWYgKHZkb20gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIHRocm93IG5ldyBFcnJvcigndmRvbSByZXR1cm5lZCBmcm9tIGNvbXBvbmVudCBjYW5ub3QgYmUgYW4gYXJyYXknKTtcbiAgfVxuXG4gIHZhciBlbGVtZW50ID0gdGhpcy5jb21wb25lbnQuY3JlYXRlKHZkb20pO1xuXG4gIGlmIChzZWxmLnN0YXRlLm9uYWRkKSB7XG4gICAgdGhpcy5hZnRlclJlbmRlcihmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLnN0YXRlLm9uYWRkKGVsZW1lbnQpO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKHNlbGYuc3RhdGUuZGV0YWNoZWQpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG59O1xuXG5Db21wb25lbnRXaWRnZXQucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChwcmV2aW91cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHJlZnJlc2ggPSAhdGhpcy5jYWNoZUtleSB8fCB0aGlzLmNhY2hlS2V5ICE9PSBwcmV2aW91cy5jYWNoZUtleTtcblxuICBpZiAocmVmcmVzaCkge1xuICAgIGlmIChzZWxmLnN0YXRlLm9udXBkYXRlKSB7XG4gICAgICB0aGlzLmFmdGVyUmVuZGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5zdGF0ZS5vbnVwZGF0ZShzZWxmLmNvbXBvbmVudC5lbGVtZW50KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuY29tcG9uZW50ID0gcHJldmlvdXMuY29tcG9uZW50O1xuICBcbiAgaWYgKHByZXZpb3VzLnN0YXRlICYmIHRoaXMuc3RhdGUpIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc3RhdGUpO1xuICAgIGZvcih2YXIgbiA9IDA7IG4gPCBrZXlzLmxlbmd0aDsgbisrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tuXTtcbiAgICAgIHByZXZpb3VzLnN0YXRlW2tleV0gPSBzZWxmLnN0YXRlW2tleV07XG4gICAgfVxuICAgIHRoaXMuc3RhdGUgPSBwcmV2aW91cy5zdGF0ZTtcbiAgfVxuXG4gIGlmIChyZWZyZXNoKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLmNvbXBvbmVudC51cGRhdGUodGhpcy5yZW5kZXIodGhpcykpO1xuXG4gICAgaWYgKHNlbGYuc3RhdGUuZGV0YWNoZWQpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgfVxufTtcblxuQ29tcG9uZW50V2lkZ2V0LnByb3RvdHlwZS5yZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmNvbXBvbmVudC51cGRhdGUodGhpcy5yZW5kZXIodGhpcykpO1xuICBpZiAodGhpcy5zdGF0ZS5vbnVwZGF0ZSkge1xuICAgIHRoaXMuc3RhdGUub251cGRhdGUodGhpcy5jb21wb25lbnQuZWxlbWVudCk7XG4gIH1cbn07XG5cbkNvbXBvbmVudFdpZGdldC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoc2VsZi5zdGF0ZS5vbnJlbW92ZSkge1xuICAgIHRoaXMuYWZ0ZXJSZW5kZXIoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5zdGF0ZS5vbnJlbW92ZShlbGVtZW50KTtcbiAgICB9KTtcbiAgfVxuXG4gIHRoaXMuY29tcG9uZW50LmRlc3Ryb3koKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHN0YXRlLCB2ZG9tKSB7XG4gIGlmICh0eXBlb2Ygc3RhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gbmV3IENvbXBvbmVudFdpZGdldCh7fSwgc3RhdGUpO1xuICB9IGVsc2UgaWYgKHN0YXRlLmNvbnN0cnVjdG9yID09PSBPYmplY3QpIHtcbiAgICByZXR1cm4gbmV3IENvbXBvbmVudFdpZGdldChzdGF0ZSwgdmRvbSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBDb21wb25lbnRXaWRnZXQoe30sIHN0YXRlKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMuQ29tcG9uZW50V2lkZ2V0ID0gQ29tcG9uZW50V2lkZ2V0O1xuIiwidmFyIGNyZWF0ZUVsZW1lbnQgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9jcmVhdGUtZWxlbWVudCcpO1xudmFyIGRpZmYgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9kaWZmJyk7XG52YXIgcGF0Y2ggPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9wYXRjaCcpO1xudmFyIGNvZXJjZVRvVmRvbSA9IHJlcXVpcmUoJy4vY29lcmNlVG9WZG9tJyk7XG5cbmZ1bmN0aW9uIERvbUNvbXBvbmVudCgpIHtcbn1cblxuRG9tQ29tcG9uZW50LnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAodmRvbSkge1xuICB2ZG9tID0gY29lcmNlVG9WZG9tKHZkb20pO1xuICB0aGlzLnZkb20gPSB2ZG9tO1xuICB0aGlzLmVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KHZkb20pO1xuICByZXR1cm4gdGhpcy5lbGVtZW50O1xufTtcblxuRG9tQ29tcG9uZW50LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAodmRvbSkge1xuICB2YXIgcGF0Y2hlcyA9IGRpZmYodGhpcy52ZG9tLCB2ZG9tKTtcbiAgdGhpcy5lbGVtZW50ID0gcGF0Y2godGhpcy5lbGVtZW50LCBwYXRjaGVzKTtcbiAgdGhpcy52ZG9tID0gdmRvbTtcbiAgcmV0dXJuIHRoaXMuZWxlbWVudDtcbn07XG5cbkRvbUNvbXBvbmVudC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIGZ1bmN0aW9uIGRlc3Ryb3lXaWRnZXRzKHZkb20pIHtcbiAgICBpZiAodmRvbS50eXBlID09PSAnV2lkZ2V0Jykge1xuICAgICAgdmRvbS5kZXN0cm95KCk7XG4gICAgfSBlbHNlIGlmICh2ZG9tLmNoaWxkcmVuKSB7XG4gICAgICB2ZG9tLmNoaWxkcmVuLmZvckVhY2goZGVzdHJveVdpZGdldHMpO1xuICAgIH1cbiAgfVxuXG4gIGRlc3Ryb3lXaWRnZXRzKHRoaXMudmRvbSk7XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5yZW1vdmVFbGVtZW50ICYmIHRoaXMuZWxlbWVudC5wYXJlbnROb2RlKSB7XG4gICAgdGhpcy5lbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5lbGVtZW50KTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZG9tQ29tcG9uZW50KCkge1xuICByZXR1cm4gbmV3IERvbUNvbXBvbmVudCgpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUNvbXBvbmVudDtcbiIsInZhciByZW5kZXJpbmcgPSByZXF1aXJlKCcuL3JlbmRlcmluZycpO1xuXG5leHBvcnRzLmh0bWwgPSByZW5kZXJpbmcuaHRtbDtcbmV4cG9ydHMuYXR0YWNoID0gcmVuZGVyaW5nLmF0dGFjaDtcbmV4cG9ydHMucmVwbGFjZSA9IHJlbmRlcmluZy5yZXBsYWNlO1xuZXhwb3J0cy5hcHBlbmQgPSByZW5kZXJpbmcuYXBwZW5kO1xuXG5leHBvcnRzLmJpbmQgPSByZXF1aXJlKCcuL29sZGJpbmQnKTtcbmV4cG9ydHMuYmluZGluZyA9IHJlbmRlcmluZy5iaW5kaW5nO1xuXG52YXIgd2luZG93RXZlbnRzID0gcmVxdWlyZSgnLi93aW5kb3dFdmVudHMnKTtcblxuZXhwb3J0cy5odG1sLndpbmRvdyA9IGZ1bmN0aW9uIChhdHRyaWJ1dGVzLCB2ZG9tKSB7XG4gIHJldHVybiB3aW5kb3dFdmVudHMoYXR0cmlidXRlcywgdmRvbSwgcmVuZGVyaW5nLmh0bWwucmVmcmVzaGlmeSk7XG59O1xuXG5leHBvcnRzLmh0bWwuY29tcG9uZW50ID0gcmVxdWlyZSgnLi9jb21wb25lbnQnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG1vZGVsLCBwcm9wZXJ0eSkge1xuICB2YXIgcGxhc3RpcU1ldGEgPSBtb2RlbC5fcGxhc3RpcU1ldGE7XG5cbiAgaWYgKCFwbGFzdGlxTWV0YSkge1xuICAgIHBsYXN0aXFNZXRhID0ge307XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG1vZGVsLCAnX3BsYXN0aXFNZXRhJywge3ZhbHVlOiBwbGFzdGlxTWV0YX0pO1xuICB9XG5cbiAgdmFyIG1ldGEgPSBwbGFzdGlxTWV0YVtwcm9wZXJ0eV07XG5cbiAgaWYgKCFtZXRhKSB7XG4gICAgbWV0YSA9IHBsYXN0aXFNZXRhW3Byb3BlcnR5XSA9IHt9O1xuICB9XG5cbiAgcmV0dXJuIG1ldGE7XG59O1xuIiwidmFyIGNyZWF0ZUVsZW1lbnQgPSByZXF1aXJlKFwiLi92ZG9tL2NyZWF0ZS1lbGVtZW50LmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlRWxlbWVudFxuIiwidmFyIGRpZmYgPSByZXF1aXJlKFwiLi92dHJlZS9kaWZmLmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZGlmZlxuIiwidmFyIGggPSByZXF1aXJlKFwiLi92aXJ0dWFsLWh5cGVyc2NyaXB0L2luZGV4LmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaFxuIiwiLyohXG4gKiBDcm9zcy1Ccm93c2VyIFNwbGl0IDEuMS4xXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDEyIFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuICogQXZhaWxhYmxlIHVuZGVyIHRoZSBNSVQgTGljZW5zZVxuICogRUNNQVNjcmlwdCBjb21wbGlhbnQsIHVuaWZvcm0gY3Jvc3MtYnJvd3NlciBzcGxpdCBtZXRob2RcbiAqL1xuXG4vKipcbiAqIFNwbGl0cyBhIHN0cmluZyBpbnRvIGFuIGFycmF5IG9mIHN0cmluZ3MgdXNpbmcgYSByZWdleCBvciBzdHJpbmcgc2VwYXJhdG9yLiBNYXRjaGVzIG9mIHRoZVxuICogc2VwYXJhdG9yIGFyZSBub3QgaW5jbHVkZWQgaW4gdGhlIHJlc3VsdCBhcnJheS4gSG93ZXZlciwgaWYgYHNlcGFyYXRvcmAgaXMgYSByZWdleCB0aGF0IGNvbnRhaW5zXG4gKiBjYXB0dXJpbmcgZ3JvdXBzLCBiYWNrcmVmZXJlbmNlcyBhcmUgc3BsaWNlZCBpbnRvIHRoZSByZXN1bHQgZWFjaCB0aW1lIGBzZXBhcmF0b3JgIGlzIG1hdGNoZWQuXG4gKiBGaXhlcyBicm93c2VyIGJ1Z3MgY29tcGFyZWQgdG8gdGhlIG5hdGl2ZSBgU3RyaW5nLnByb3RvdHlwZS5zcGxpdGAgYW5kIGNhbiBiZSB1c2VkIHJlbGlhYmx5XG4gKiBjcm9zcy1icm93c2VyLlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBTdHJpbmcgdG8gc3BsaXQuXG4gKiBAcGFyYW0ge1JlZ0V4cHxTdHJpbmd9IHNlcGFyYXRvciBSZWdleCBvciBzdHJpbmcgdG8gdXNlIGZvciBzZXBhcmF0aW5nIHRoZSBzdHJpbmcuXG4gKiBAcGFyYW0ge051bWJlcn0gW2xpbWl0XSBNYXhpbXVtIG51bWJlciBvZiBpdGVtcyB0byBpbmNsdWRlIGluIHRoZSByZXN1bHQgYXJyYXkuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1YnN0cmluZ3MuXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIEJhc2ljIHVzZVxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcpO1xuICogLy8gLT4gWydhJywgJ2InLCAnYycsICdkJ11cbiAqXG4gKiAvLyBXaXRoIGxpbWl0XG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJywgMik7XG4gKiAvLyAtPiBbJ2EnLCAnYiddXG4gKlxuICogLy8gQmFja3JlZmVyZW5jZXMgaW4gcmVzdWx0IGFycmF5XG4gKiBzcGxpdCgnLi53b3JkMSB3b3JkMi4uJywgLyhbYS16XSspKFxcZCspL2kpO1xuICogLy8gLT4gWycuLicsICd3b3JkJywgJzEnLCAnICcsICd3b3JkJywgJzInLCAnLi4nXVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBzcGxpdCh1bmRlZikge1xuXG4gIHZhciBuYXRpdmVTcGxpdCA9IFN0cmluZy5wcm90b3R5cGUuc3BsaXQsXG4gICAgY29tcGxpYW50RXhlY05wY2cgPSAvKCk/Py8uZXhlYyhcIlwiKVsxXSA9PT0gdW5kZWYsXG4gICAgLy8gTlBDRzogbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBcbiAgICBzZWxmO1xuXG4gIHNlbGYgPSBmdW5jdGlvbihzdHIsIHNlcGFyYXRvciwgbGltaXQpIHtcbiAgICAvLyBJZiBgc2VwYXJhdG9yYCBpcyBub3QgYSByZWdleCwgdXNlIGBuYXRpdmVTcGxpdGBcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHNlcGFyYXRvcikgIT09IFwiW29iamVjdCBSZWdFeHBdXCIpIHtcbiAgICAgIHJldHVybiBuYXRpdmVTcGxpdC5jYWxsKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCk7XG4gICAgfVxuICAgIHZhciBvdXRwdXQgPSBbXSxcbiAgICAgIGZsYWdzID0gKHNlcGFyYXRvci5pZ25vcmVDYXNlID8gXCJpXCIgOiBcIlwiKSArIChzZXBhcmF0b3IubXVsdGlsaW5lID8gXCJtXCIgOiBcIlwiKSArIChzZXBhcmF0b3IuZXh0ZW5kZWQgPyBcInhcIiA6IFwiXCIpICsgLy8gUHJvcG9zZWQgZm9yIEVTNlxuICAgICAgKHNlcGFyYXRvci5zdGlja3kgPyBcInlcIiA6IFwiXCIpLFxuICAgICAgLy8gRmlyZWZveCAzK1xuICAgICAgbGFzdExhc3RJbmRleCA9IDAsXG4gICAgICAvLyBNYWtlIGBnbG9iYWxgIGFuZCBhdm9pZCBgbGFzdEluZGV4YCBpc3N1ZXMgYnkgd29ya2luZyB3aXRoIGEgY29weVxuICAgICAgc2VwYXJhdG9yID0gbmV3IFJlZ0V4cChzZXBhcmF0b3Iuc291cmNlLCBmbGFncyArIFwiZ1wiKSxcbiAgICAgIHNlcGFyYXRvcjIsIG1hdGNoLCBsYXN0SW5kZXgsIGxhc3RMZW5ndGg7XG4gICAgc3RyICs9IFwiXCI7IC8vIFR5cGUtY29udmVydFxuICAgIGlmICghY29tcGxpYW50RXhlY05wY2cpIHtcbiAgICAgIC8vIERvZXNuJ3QgbmVlZCBmbGFncyBneSwgYnV0IHRoZXkgZG9uJ3QgaHVydFxuICAgICAgc2VwYXJhdG9yMiA9IG5ldyBSZWdFeHAoXCJeXCIgKyBzZXBhcmF0b3Iuc291cmNlICsgXCIkKD8hXFxcXHMpXCIsIGZsYWdzKTtcbiAgICB9XG4gICAgLyogVmFsdWVzIGZvciBgbGltaXRgLCBwZXIgdGhlIHNwZWM6XG4gICAgICogSWYgdW5kZWZpbmVkOiA0Mjk0OTY3Mjk1IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICAgKiBJZiAwLCBJbmZpbml0eSwgb3IgTmFOOiAwXG4gICAgICogSWYgcG9zaXRpdmUgbnVtYmVyOiBsaW1pdCA9IE1hdGguZmxvb3IobGltaXQpOyBpZiAobGltaXQgPiA0Mjk0OTY3Mjk1KSBsaW1pdCAtPSA0Mjk0OTY3Mjk2O1xuICAgICAqIElmIG5lZ2F0aXZlIG51bWJlcjogNDI5NDk2NzI5NiAtIE1hdGguZmxvb3IoTWF0aC5hYnMobGltaXQpKVxuICAgICAqIElmIG90aGVyOiBUeXBlLWNvbnZlcnQsIHRoZW4gdXNlIHRoZSBhYm92ZSBydWxlc1xuICAgICAqL1xuICAgIGxpbWl0ID0gbGltaXQgPT09IHVuZGVmID8gLTEgPj4+IDAgOiAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgbGltaXQgPj4+IDA7IC8vIFRvVWludDMyKGxpbWl0KVxuICAgIHdoaWxlIChtYXRjaCA9IHNlcGFyYXRvci5leGVjKHN0cikpIHtcbiAgICAgIC8vIGBzZXBhcmF0b3IubGFzdEluZGV4YCBpcyBub3QgcmVsaWFibGUgY3Jvc3MtYnJvd3NlclxuICAgICAgbGFzdEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG4gICAgICBpZiAobGFzdEluZGV4ID4gbGFzdExhc3RJbmRleCkge1xuICAgICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCwgbWF0Y2guaW5kZXgpKTtcbiAgICAgICAgLy8gRml4IGJyb3dzZXJzIHdob3NlIGBleGVjYCBtZXRob2RzIGRvbid0IGNvbnNpc3RlbnRseSByZXR1cm4gYHVuZGVmaW5lZGAgZm9yXG4gICAgICAgIC8vIG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3Vwc1xuICAgICAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnICYmIG1hdGNoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBtYXRjaFswXS5yZXBsYWNlKHNlcGFyYXRvcjIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoIC0gMjsgaSsrKSB7XG4gICAgICAgICAgICAgIGlmIChhcmd1bWVudHNbaV0gPT09IHVuZGVmKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hbaV0gPSB1bmRlZjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaC5sZW5ndGggPiAxICYmIG1hdGNoLmluZGV4IDwgc3RyLmxlbmd0aCkge1xuICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG91dHB1dCwgbWF0Y2guc2xpY2UoMSkpO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RMZW5ndGggPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIGxhc3RMYXN0SW5kZXggPSBsYXN0SW5kZXg7XG4gICAgICAgIGlmIChvdXRwdXQubGVuZ3RoID49IGxpbWl0KSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzZXBhcmF0b3IubGFzdEluZGV4ID09PSBtYXRjaC5pbmRleCkge1xuICAgICAgICBzZXBhcmF0b3IubGFzdEluZGV4Kys7IC8vIEF2b2lkIGFuIGluZmluaXRlIGxvb3BcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGxhc3RMYXN0SW5kZXggPT09IHN0ci5sZW5ndGgpIHtcbiAgICAgIGlmIChsYXN0TGVuZ3RoIHx8ICFzZXBhcmF0b3IudGVzdChcIlwiKSkge1xuICAgICAgICBvdXRwdXQucHVzaChcIlwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dC5sZW5ndGggPiBsaW1pdCA/IG91dHB1dC5zbGljZSgwLCBsaW1pdCkgOiBvdXRwdXQ7XG4gIH07XG5cbiAgcmV0dXJuIHNlbGY7XG59KSgpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgT25lVmVyc2lvbkNvbnN0cmFpbnQgPSByZXF1aXJlKCdpbmRpdmlkdWFsL29uZS12ZXJzaW9uJyk7XG5cbnZhciBNWV9WRVJTSU9OID0gJzcnO1xuT25lVmVyc2lvbkNvbnN0cmFpbnQoJ2V2LXN0b3JlJywgTVlfVkVSU0lPTik7XG5cbnZhciBoYXNoS2V5ID0gJ19fRVZfU1RPUkVfS0VZQCcgKyBNWV9WRVJTSU9OO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2U3RvcmU7XG5cbmZ1bmN0aW9uIEV2U3RvcmUoZWxlbSkge1xuICAgIHZhciBoYXNoID0gZWxlbVtoYXNoS2V5XTtcblxuICAgIGlmICghaGFzaCkge1xuICAgICAgICBoYXNoID0gZWxlbVtoYXNoS2V5XSA9IHt9O1xuICAgIH1cblxuICAgIHJldHVybiBoYXNoO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKmdsb2JhbCB3aW5kb3csIGdsb2JhbCovXG5cbnZhciByb290ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID9cbiAgICBnbG9iYWwgOiB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmRpdmlkdWFsO1xuXG5mdW5jdGlvbiBJbmRpdmlkdWFsKGtleSwgdmFsdWUpIHtcbiAgICBpZiAoa2V5IGluIHJvb3QpIHtcbiAgICAgICAgcmV0dXJuIHJvb3Rba2V5XTtcbiAgICB9XG5cbiAgICByb290W2tleV0gPSB2YWx1ZTtcblxuICAgIHJldHVybiB2YWx1ZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEluZGl2aWR1YWwgPSByZXF1aXJlKCcuL2luZGV4LmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gT25lVmVyc2lvbjtcblxuZnVuY3Rpb24gT25lVmVyc2lvbihtb2R1bGVOYW1lLCB2ZXJzaW9uLCBkZWZhdWx0VmFsdWUpIHtcbiAgICB2YXIga2V5ID0gJ19fSU5ESVZJRFVBTF9PTkVfVkVSU0lPTl8nICsgbW9kdWxlTmFtZTtcbiAgICB2YXIgZW5mb3JjZUtleSA9IGtleSArICdfRU5GT1JDRV9TSU5HTEVUT04nO1xuXG4gICAgdmFyIHZlcnNpb25WYWx1ZSA9IEluZGl2aWR1YWwoZW5mb3JjZUtleSwgdmVyc2lvbik7XG5cbiAgICBpZiAodmVyc2lvblZhbHVlICE9PSB2ZXJzaW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG9ubHkgaGF2ZSBvbmUgY29weSBvZiAnICtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgKyAnLlxcbicgK1xuICAgICAgICAgICAgJ1lvdSBhbHJlYWR5IGhhdmUgdmVyc2lvbiAnICsgdmVyc2lvblZhbHVlICtcbiAgICAgICAgICAgICcgaW5zdGFsbGVkLlxcbicgK1xuICAgICAgICAgICAgJ1RoaXMgbWVhbnMgeW91IGNhbm5vdCBpbnN0YWxsIHZlcnNpb24gJyArIHZlcnNpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBJbmRpdmlkdWFsKGtleSwgZGVmYXVsdFZhbHVlKTtcbn1cbiIsInZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2N1bWVudDtcbn0gZWxzZSB7XG4gICAgdmFyIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXTtcblxuICAgIGlmICghZG9jY3kpIHtcbiAgICAgICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddID0gbWluRG9jO1xuICAgIH1cblxuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc09iamVjdCh4KSB7XG5cdHJldHVybiB0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiB4ICE9PSBudWxsO1xufTtcbiIsInZhciBuYXRpdmVJc0FycmF5ID0gQXJyYXkuaXNBcnJheVxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5hdGl2ZUlzQXJyYXkgfHwgaXNBcnJheVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIlxufVxuIiwidmFyIHBhdGNoID0gcmVxdWlyZShcIi4vdmRvbS9wYXRjaC5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGNoXG4iLCJ2YXIgaXNPYmplY3QgPSByZXF1aXJlKFwiaXMtb2JqZWN0XCIpXG52YXIgaXNIb29rID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZob29rLmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gYXBwbHlQcm9wZXJ0aWVzXG5cbmZ1bmN0aW9uIGFwcGx5UHJvcGVydGllcyhub2RlLCBwcm9wcywgcHJldmlvdXMpIHtcbiAgICBmb3IgKHZhciBwcm9wTmFtZSBpbiBwcm9wcykge1xuICAgICAgICB2YXIgcHJvcFZhbHVlID0gcHJvcHNbcHJvcE5hbWVdXG5cbiAgICAgICAgaWYgKHByb3BWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZW1vdmVQcm9wZXJ0eShub2RlLCBwcm9wTmFtZSwgcHJvcFZhbHVlLCBwcmV2aW91cyk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNIb29rKHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICAgIHJlbW92ZVByb3BlcnR5KG5vZGUsIHByb3BOYW1lLCBwcm9wVmFsdWUsIHByZXZpb3VzKVxuICAgICAgICAgICAgaWYgKHByb3BWYWx1ZS5ob29rKSB7XG4gICAgICAgICAgICAgICAgcHJvcFZhbHVlLmhvb2sobm9kZSxcbiAgICAgICAgICAgICAgICAgICAgcHJvcE5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHByZXZpb3VzID8gcHJldmlvdXNbcHJvcE5hbWVdIDogdW5kZWZpbmVkKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBwYXRjaE9iamVjdChub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lLCBwcm9wVmFsdWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHByb3BWYWx1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVQcm9wZXJ0eShub2RlLCBwcm9wTmFtZSwgcHJvcFZhbHVlLCBwcmV2aW91cykge1xuICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzW3Byb3BOYW1lXVxuXG4gICAgICAgIGlmICghaXNIb29rKHByZXZpb3VzVmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAocHJvcE5hbWUgPT09IFwiYXR0cmlidXRlc1wiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXR0ck5hbWUgaW4gcHJldmlvdXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BOYW1lID09PSBcInN0eWxlXCIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHByZXZpb3VzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHlsZVtpXSA9IFwiXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcmV2aW91c1ZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBcIlwiXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHByZXZpb3VzVmFsdWUudW5ob29rKSB7XG4gICAgICAgICAgICBwcmV2aW91c1ZhbHVlLnVuaG9vayhub2RlLCBwcm9wTmFtZSwgcHJvcFZhbHVlKVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwYXRjaE9iamVjdChub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lLCBwcm9wVmFsdWUpIHtcbiAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzID8gcHJldmlvdXNbcHJvcE5hbWVdIDogdW5kZWZpbmVkXG5cbiAgICAvLyBTZXQgYXR0cmlidXRlc1xuICAgIGlmIChwcm9wTmFtZSA9PT0gXCJhdHRyaWJ1dGVzXCIpIHtcbiAgICAgICAgZm9yICh2YXIgYXR0ck5hbWUgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgYXR0clZhbHVlID0gcHJvcFZhbHVlW2F0dHJOYW1lXVxuXG4gICAgICAgICAgICBpZiAoYXR0clZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0ck5hbWUsIGF0dHJWYWx1ZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmKHByZXZpb3VzVmFsdWUgJiYgaXNPYmplY3QocHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgZ2V0UHJvdG90eXBlKHByZXZpb3VzVmFsdWUpICE9PSBnZXRQcm90b3R5cGUocHJvcFZhbHVlKSkge1xuICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHByb3BWYWx1ZVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAoIWlzT2JqZWN0KG5vZGVbcHJvcE5hbWVdKSkge1xuICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHt9XG4gICAgfVxuXG4gICAgdmFyIHJlcGxhY2VyID0gcHJvcE5hbWUgPT09IFwic3R5bGVcIiA/IFwiXCIgOiB1bmRlZmluZWRcblxuICAgIGZvciAodmFyIGsgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHByb3BWYWx1ZVtrXVxuICAgICAgICBub2RlW3Byb3BOYW1lXVtrXSA9ICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSA/IHJlcGxhY2VyIDogdmFsdWVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZSh2YWx1ZSkge1xuICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSlcbiAgICB9IGVsc2UgaWYgKHZhbHVlLl9fcHJvdG9fXykge1xuICAgICAgICByZXR1cm4gdmFsdWUuX19wcm90b19fXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlXG4gICAgfVxufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxuXG52YXIgYXBwbHlQcm9wZXJ0aWVzID0gcmVxdWlyZShcIi4vYXBwbHktcHJvcGVydGllc1wiKVxuXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy12bm9kZS5qc1wiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdnRleHQuanNcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy13aWRnZXQuanNcIilcbnZhciBoYW5kbGVUaHVuayA9IHJlcXVpcmUoXCIuLi92bm9kZS9oYW5kbGUtdGh1bmsuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodm5vZGUsIG9wdHMpIHtcbiAgICB2YXIgZG9jID0gb3B0cyA/IG9wdHMuZG9jdW1lbnQgfHwgZG9jdW1lbnQgOiBkb2N1bWVudFxuICAgIHZhciB3YXJuID0gb3B0cyA/IG9wdHMud2FybiA6IG51bGxcblxuICAgIHZub2RlID0gaGFuZGxlVGh1bmsodm5vZGUpLmFcblxuICAgIGlmIChpc1dpZGdldCh2bm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIHZub2RlLmluaXQoKVxuICAgIH0gZWxzZSBpZiAoaXNWVGV4dCh2bm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIGRvYy5jcmVhdGVUZXh0Tm9kZSh2bm9kZS50ZXh0KVxuICAgIH0gZWxzZSBpZiAoIWlzVk5vZGUodm5vZGUpKSB7XG4gICAgICAgIGlmICh3YXJuKSB7XG4gICAgICAgICAgICB3YXJuKFwiSXRlbSBpcyBub3QgYSB2YWxpZCB2aXJ0dWFsIGRvbSBub2RlXCIsIHZub2RlKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSAodm5vZGUubmFtZXNwYWNlID09PSBudWxsKSA/XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50KHZub2RlLnRhZ05hbWUpIDpcbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnROUyh2bm9kZS5uYW1lc3BhY2UsIHZub2RlLnRhZ05hbWUpXG5cbiAgICB2YXIgcHJvcHMgPSB2bm9kZS5wcm9wZXJ0aWVzXG4gICAgYXBwbHlQcm9wZXJ0aWVzKG5vZGUsIHByb3BzKVxuXG4gICAgdmFyIGNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkTm9kZSA9IGNyZWF0ZUVsZW1lbnQoY2hpbGRyZW5baV0sIG9wdHMpXG4gICAgICAgIGlmIChjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGROb2RlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGVcbn1cbiIsIi8vIE1hcHMgYSB2aXJ0dWFsIERPTSB0cmVlIG9udG8gYSByZWFsIERPTSB0cmVlIGluIGFuIGVmZmljaWVudCBtYW5uZXIuXG4vLyBXZSBkb24ndCB3YW50IHRvIHJlYWQgYWxsIG9mIHRoZSBET00gbm9kZXMgaW4gdGhlIHRyZWUgc28gd2UgdXNlXG4vLyB0aGUgaW4tb3JkZXIgdHJlZSBpbmRleGluZyB0byBlbGltaW5hdGUgcmVjdXJzaW9uIGRvd24gY2VydGFpbiBicmFuY2hlcy5cbi8vIFdlIG9ubHkgcmVjdXJzZSBpbnRvIGEgRE9NIG5vZGUgaWYgd2Uga25vdyB0aGF0IGl0IGNvbnRhaW5zIGEgY2hpbGQgb2Zcbi8vIGludGVyZXN0LlxuXG52YXIgbm9DaGlsZCA9IHt9XG5cbm1vZHVsZS5leHBvcnRzID0gZG9tSW5kZXhcblxuZnVuY3Rpb24gZG9tSW5kZXgocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzKSB7XG4gICAgaWYgKCFpbmRpY2VzIHx8IGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7fVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGluZGljZXMuc29ydChhc2NlbmRpbmcpXG4gICAgICAgIHJldHVybiByZWN1cnNlKHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2RlcywgMClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlY3Vyc2Uocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzLCByb290SW5kZXgpIHtcbiAgICBub2RlcyA9IG5vZGVzIHx8IHt9XG5cblxuICAgIGlmIChyb290Tm9kZSkge1xuICAgICAgICBpZiAoaW5kZXhJblJhbmdlKGluZGljZXMsIHJvb3RJbmRleCwgcm9vdEluZGV4KSkge1xuICAgICAgICAgICAgbm9kZXNbcm9vdEluZGV4XSA9IHJvb3ROb2RlXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdkNoaWxkcmVuID0gdHJlZS5jaGlsZHJlblxuXG4gICAgICAgIGlmICh2Q2hpbGRyZW4pIHtcblxuICAgICAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSByb290Tm9kZS5jaGlsZE5vZGVzXG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJvb3RJbmRleCArPSAxXG5cbiAgICAgICAgICAgICAgICB2YXIgdkNoaWxkID0gdkNoaWxkcmVuW2ldIHx8IG5vQ2hpbGRcbiAgICAgICAgICAgICAgICB2YXIgbmV4dEluZGV4ID0gcm9vdEluZGV4ICsgKHZDaGlsZC5jb3VudCB8fCAwKVxuXG4gICAgICAgICAgICAgICAgLy8gc2tpcCByZWN1cnNpb24gZG93biB0aGUgdHJlZSBpZiB0aGVyZSBhcmUgbm8gbm9kZXMgZG93biBoZXJlXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4SW5SYW5nZShpbmRpY2VzLCByb290SW5kZXgsIG5leHRJbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVjdXJzZShjaGlsZE5vZGVzW2ldLCB2Q2hpbGQsIGluZGljZXMsIG5vZGVzLCByb290SW5kZXgpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcm9vdEluZGV4ID0gbmV4dEluZGV4XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZXNcbn1cblxuLy8gQmluYXJ5IHNlYXJjaCBmb3IgYW4gaW5kZXggaW4gdGhlIGludGVydmFsIFtsZWZ0LCByaWdodF1cbmZ1bmN0aW9uIGluZGV4SW5SYW5nZShpbmRpY2VzLCBsZWZ0LCByaWdodCkge1xuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgbWluSW5kZXggPSAwXG4gICAgdmFyIG1heEluZGV4ID0gaW5kaWNlcy5sZW5ndGggLSAxXG4gICAgdmFyIGN1cnJlbnRJbmRleFxuICAgIHZhciBjdXJyZW50SXRlbVxuXG4gICAgd2hpbGUgKG1pbkluZGV4IDw9IG1heEluZGV4KSB7XG4gICAgICAgIGN1cnJlbnRJbmRleCA9ICgobWF4SW5kZXggKyBtaW5JbmRleCkgLyAyKSA+PiAwXG4gICAgICAgIGN1cnJlbnRJdGVtID0gaW5kaWNlc1tjdXJyZW50SW5kZXhdXG5cbiAgICAgICAgaWYgKG1pbkluZGV4ID09PSBtYXhJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRJdGVtID49IGxlZnQgJiYgY3VycmVudEl0ZW0gPD0gcmlnaHRcbiAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50SXRlbSA8IGxlZnQpIHtcbiAgICAgICAgICAgIG1pbkluZGV4ID0gY3VycmVudEluZGV4ICsgMVxuICAgICAgICB9IGVsc2UgIGlmIChjdXJyZW50SXRlbSA+IHJpZ2h0KSB7XG4gICAgICAgICAgICBtYXhJbmRleCA9IGN1cnJlbnRJbmRleCAtIDFcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gICAgcmV0dXJuIGEgPiBiID8gMSA6IC0xXG59XG4iLCJ2YXIgYXBwbHlQcm9wZXJ0aWVzID0gcmVxdWlyZShcIi4vYXBwbHktcHJvcGVydGllc1wiKVxuXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtd2lkZ2V0LmpzXCIpXG52YXIgVlBhdGNoID0gcmVxdWlyZShcIi4uL3Zub2RlL3ZwYXRjaC5qc1wiKVxuXG52YXIgdXBkYXRlV2lkZ2V0ID0gcmVxdWlyZShcIi4vdXBkYXRlLXdpZGdldFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcGx5UGF0Y2hcblxuZnVuY3Rpb24gYXBwbHlQYXRjaCh2cGF0Y2gsIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgdHlwZSA9IHZwYXRjaC50eXBlXG4gICAgdmFyIHZOb2RlID0gdnBhdGNoLnZOb2RlXG4gICAgdmFyIHBhdGNoID0gdnBhdGNoLnBhdGNoXG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSBWUGF0Y2guUkVNT1ZFOlxuICAgICAgICAgICAgcmV0dXJuIHJlbW92ZU5vZGUoZG9tTm9kZSwgdk5vZGUpXG4gICAgICAgIGNhc2UgVlBhdGNoLklOU0VSVDpcbiAgICAgICAgICAgIHJldHVybiBpbnNlcnROb2RlKGRvbU5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5WVEVYVDpcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmdQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLldJREdFVDpcbiAgICAgICAgICAgIHJldHVybiB3aWRnZXRQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLlZOT0RFOlxuICAgICAgICAgICAgcmV0dXJuIHZOb2RlUGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5PUkRFUjpcbiAgICAgICAgICAgIHJlb3JkZXJDaGlsZHJlbihkb21Ob2RlLCBwYXRjaClcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgICAgIGNhc2UgVlBhdGNoLlBST1BTOlxuICAgICAgICAgICAgYXBwbHlQcm9wZXJ0aWVzKGRvbU5vZGUsIHBhdGNoLCB2Tm9kZS5wcm9wZXJ0aWVzKVxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICAgICAgY2FzZSBWUGF0Y2guVEhVTks6XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZVJvb3QoZG9tTm9kZSxcbiAgICAgICAgICAgICAgICByZW5kZXJPcHRpb25zLnBhdGNoKGRvbU5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKSlcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVOb2RlKGRvbU5vZGUsIHZOb2RlKSB7XG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZG9tTm9kZSlcbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIHZOb2RlKTtcblxuICAgIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGluc2VydE5vZGUocGFyZW50Tm9kZSwgdk5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgbmV3Tm9kZSA9IHJlbmRlck9wdGlvbnMucmVuZGVyKHZOb2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5hcHBlbmRDaGlsZChuZXdOb2RlKVxuICAgIH1cblxuICAgIHJldHVybiBwYXJlbnROb2RlXG59XG5cbmZ1bmN0aW9uIHN0cmluZ1BhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgdlRleHQsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgbmV3Tm9kZVxuXG4gICAgaWYgKGRvbU5vZGUubm9kZVR5cGUgPT09IDMpIHtcbiAgICAgICAgZG9tTm9kZS5yZXBsYWNlRGF0YSgwLCBkb21Ob2RlLmxlbmd0aCwgdlRleHQudGV4dClcbiAgICAgICAgbmV3Tm9kZSA9IGRvbU5vZGVcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuICAgICAgICBuZXdOb2RlID0gcmVuZGVyT3B0aW9ucy5yZW5kZXIodlRleHQsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgaWYgKHBhcmVudE5vZGUgJiYgbmV3Tm9kZSAhPT0gZG9tTm9kZSkge1xuICAgICAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIHdpZGdldFBhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgd2lkZ2V0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIHVwZGF0aW5nID0gdXBkYXRlV2lkZ2V0KGxlZnRWTm9kZSwgd2lkZ2V0KVxuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAodXBkYXRpbmcpIHtcbiAgICAgICAgbmV3Tm9kZSA9IHdpZGdldC51cGRhdGUobGVmdFZOb2RlLCBkb21Ob2RlKSB8fCBkb21Ob2RlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmV3Tm9kZSA9IHJlbmRlck9wdGlvbnMucmVuZGVyKHdpZGdldCwgcmVuZGVyT3B0aW9ucylcbiAgICB9XG5cbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuXG4gICAgaWYgKHBhcmVudE5vZGUgJiYgbmV3Tm9kZSAhPT0gZG9tTm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkb21Ob2RlKVxuICAgIH1cblxuICAgIGlmICghdXBkYXRpbmcpIHtcbiAgICAgICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCBsZWZ0Vk5vZGUpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld05vZGVcbn1cblxuZnVuY3Rpb24gdk5vZGVQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHZOb2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcbiAgICB2YXIgbmV3Tm9kZSA9IHJlbmRlck9wdGlvbnMucmVuZGVyKHZOb2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgaWYgKHBhcmVudE5vZGUgJiYgbmV3Tm9kZSAhPT0gZG9tTm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkb21Ob2RlKVxuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgdykge1xuICAgIGlmICh0eXBlb2Ygdy5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIgJiYgaXNXaWRnZXQodykpIHtcbiAgICAgICAgdy5kZXN0cm95KGRvbU5vZGUpXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW9yZGVyQ2hpbGRyZW4oZG9tTm9kZSwgbW92ZXMpIHtcbiAgICB2YXIgY2hpbGROb2RlcyA9IGRvbU5vZGUuY2hpbGROb2Rlc1xuICAgIHZhciBrZXlNYXAgPSB7fVxuICAgIHZhciBub2RlXG4gICAgdmFyIHJlbW92ZVxuICAgIHZhciBpbnNlcnRcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbW92ZXMucmVtb3Zlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICByZW1vdmUgPSBtb3Zlcy5yZW1vdmVzW2ldXG4gICAgICAgIG5vZGUgPSBjaGlsZE5vZGVzW3JlbW92ZS5mcm9tXVxuICAgICAgICBpZiAocmVtb3ZlLmtleSkge1xuICAgICAgICAgICAga2V5TWFwW3JlbW92ZS5rZXldID0gbm9kZVxuICAgICAgICB9XG4gICAgICAgIGRvbU5vZGUucmVtb3ZlQ2hpbGQobm9kZSlcbiAgICB9XG5cbiAgICB2YXIgbGVuZ3RoID0gY2hpbGROb2Rlcy5sZW5ndGhcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1vdmVzLmluc2VydHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaW5zZXJ0ID0gbW92ZXMuaW5zZXJ0c1tqXVxuICAgICAgICBub2RlID0ga2V5TWFwW2luc2VydC5rZXldXG4gICAgICAgIC8vIHRoaXMgaXMgdGhlIHdlaXJkZXN0IGJ1ZyBpJ3ZlIGV2ZXIgc2VlbiBpbiB3ZWJraXRcbiAgICAgICAgZG9tTm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgaW5zZXJ0LnRvID49IGxlbmd0aCsrID8gbnVsbCA6IGNoaWxkTm9kZXNbaW5zZXJ0LnRvXSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VSb290KG9sZFJvb3QsIG5ld1Jvb3QpIHtcbiAgICBpZiAob2xkUm9vdCAmJiBuZXdSb290ICYmIG9sZFJvb3QgIT09IG5ld1Jvb3QgJiYgb2xkUm9vdC5wYXJlbnROb2RlKSB7XG4gICAgICAgIG9sZFJvb3QucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Um9vdCwgb2xkUm9vdClcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Um9vdDtcbn1cbiIsInZhciBkb2N1bWVudCA9IHJlcXVpcmUoXCJnbG9iYWwvZG9jdW1lbnRcIilcbnZhciBpc0FycmF5ID0gcmVxdWlyZShcIngtaXMtYXJyYXlcIilcblxudmFyIHJlbmRlciA9IHJlcXVpcmUoXCIuL2NyZWF0ZS1lbGVtZW50XCIpXG52YXIgZG9tSW5kZXggPSByZXF1aXJlKFwiLi9kb20taW5kZXhcIilcbnZhciBwYXRjaE9wID0gcmVxdWlyZShcIi4vcGF0Y2gtb3BcIilcbm1vZHVsZS5leHBvcnRzID0gcGF0Y2hcblxuZnVuY3Rpb24gcGF0Y2gocm9vdE5vZGUsIHBhdGNoZXMsIHJlbmRlck9wdGlvbnMpIHtcbiAgICByZW5kZXJPcHRpb25zID0gcmVuZGVyT3B0aW9ucyB8fCB7fVxuICAgIHJlbmRlck9wdGlvbnMucGF0Y2ggPSByZW5kZXJPcHRpb25zLnBhdGNoICYmIHJlbmRlck9wdGlvbnMucGF0Y2ggIT09IHBhdGNoXG4gICAgICAgID8gcmVuZGVyT3B0aW9ucy5wYXRjaFxuICAgICAgICA6IHBhdGNoUmVjdXJzaXZlXG4gICAgcmVuZGVyT3B0aW9ucy5yZW5kZXIgPSByZW5kZXJPcHRpb25zLnJlbmRlciB8fCByZW5kZXJcblxuICAgIHJldHVybiByZW5kZXJPcHRpb25zLnBhdGNoKHJvb3ROb2RlLCBwYXRjaGVzLCByZW5kZXJPcHRpb25zKVxufVxuXG5mdW5jdGlvbiBwYXRjaFJlY3Vyc2l2ZShyb290Tm9kZSwgcGF0Y2hlcywgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBpbmRpY2VzID0gcGF0Y2hJbmRpY2VzKHBhdGNoZXMpXG5cbiAgICBpZiAoaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHJvb3ROb2RlXG4gICAgfVxuXG4gICAgdmFyIGluZGV4ID0gZG9tSW5kZXgocm9vdE5vZGUsIHBhdGNoZXMuYSwgaW5kaWNlcylcbiAgICB2YXIgb3duZXJEb2N1bWVudCA9IHJvb3ROb2RlLm93bmVyRG9jdW1lbnRcblxuICAgIGlmICghcmVuZGVyT3B0aW9ucy5kb2N1bWVudCAmJiBvd25lckRvY3VtZW50ICE9PSBkb2N1bWVudCkge1xuICAgICAgICByZW5kZXJPcHRpb25zLmRvY3VtZW50ID0gb3duZXJEb2N1bWVudFxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5kaWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbm9kZUluZGV4ID0gaW5kaWNlc1tpXVxuICAgICAgICByb290Tm9kZSA9IGFwcGx5UGF0Y2gocm9vdE5vZGUsXG4gICAgICAgICAgICBpbmRleFtub2RlSW5kZXhdLFxuICAgICAgICAgICAgcGF0Y2hlc1tub2RlSW5kZXhdLFxuICAgICAgICAgICAgcmVuZGVyT3B0aW9ucylcbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdE5vZGVcbn1cblxuZnVuY3Rpb24gYXBwbHlQYXRjaChyb290Tm9kZSwgZG9tTm9kZSwgcGF0Y2hMaXN0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgaWYgKCFkb21Ob2RlKSB7XG4gICAgICAgIHJldHVybiByb290Tm9kZVxuICAgIH1cblxuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAoaXNBcnJheShwYXRjaExpc3QpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0Y2hMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBuZXdOb2RlID0gcGF0Y2hPcChwYXRjaExpc3RbaV0sIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgICAgIGlmIChkb21Ob2RlID09PSByb290Tm9kZSkge1xuICAgICAgICAgICAgICAgIHJvb3ROb2RlID0gbmV3Tm9kZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbmV3Tm9kZSA9IHBhdGNoT3AocGF0Y2hMaXN0LCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgIGlmIChkb21Ob2RlID09PSByb290Tm9kZSkge1xuICAgICAgICAgICAgcm9vdE5vZGUgPSBuZXdOb2RlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcm9vdE5vZGVcbn1cblxuZnVuY3Rpb24gcGF0Y2hJbmRpY2VzKHBhdGNoZXMpIHtcbiAgICB2YXIgaW5kaWNlcyA9IFtdXG5cbiAgICBmb3IgKHZhciBrZXkgaW4gcGF0Y2hlcykge1xuICAgICAgICBpZiAoa2V5ICE9PSBcImFcIikge1xuICAgICAgICAgICAgaW5kaWNlcy5wdXNoKE51bWJlcihrZXkpKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGluZGljZXNcbn1cbiIsInZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy13aWRnZXQuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSB1cGRhdGVXaWRnZXRcblxuZnVuY3Rpb24gdXBkYXRlV2lkZ2V0KGEsIGIpIHtcbiAgICBpZiAoaXNXaWRnZXQoYSkgJiYgaXNXaWRnZXQoYikpIHtcbiAgICAgICAgaWYgKFwibmFtZVwiIGluIGEgJiYgXCJuYW1lXCIgaW4gYikge1xuICAgICAgICAgICAgcmV0dXJuIGEuaWQgPT09IGIuaWRcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBhLmluaXQgPT09IGIuaW5pdFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlXG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdlN0b3JlID0gcmVxdWlyZSgnZXYtc3RvcmUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdkhvb2s7XG5cbmZ1bmN0aW9uIEV2SG9vayh2YWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBFdkhvb2spKSB7XG4gICAgICAgIHJldHVybiBuZXcgRXZIb29rKHZhbHVlKTtcbiAgICB9XG5cbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cbkV2SG9vay5wcm90b3R5cGUuaG9vayA9IGZ1bmN0aW9uIChub2RlLCBwcm9wZXJ0eU5hbWUpIHtcbiAgICB2YXIgZXMgPSBFdlN0b3JlKG5vZGUpO1xuICAgIHZhciBwcm9wTmFtZSA9IHByb3BlcnR5TmFtZS5zdWJzdHIoMyk7XG5cbiAgICBlc1twcm9wTmFtZV0gPSB0aGlzLnZhbHVlO1xufTtcblxuRXZIb29rLnByb3RvdHlwZS51bmhvb2sgPSBmdW5jdGlvbihub2RlLCBwcm9wZXJ0eU5hbWUpIHtcbiAgICB2YXIgZXMgPSBFdlN0b3JlKG5vZGUpO1xuICAgIHZhciBwcm9wTmFtZSA9IHByb3BlcnR5TmFtZS5zdWJzdHIoMyk7XG5cbiAgICBlc1twcm9wTmFtZV0gPSB1bmRlZmluZWQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNvZnRTZXRIb29rO1xuXG5mdW5jdGlvbiBTb2Z0U2V0SG9vayh2YWx1ZSkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTb2Z0U2V0SG9vaykpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTb2Z0U2V0SG9vayh2YWx1ZSk7XG4gICAgfVxuXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5Tb2Z0U2V0SG9vay5wcm90b3R5cGUuaG9vayA9IGZ1bmN0aW9uIChub2RlLCBwcm9wZXJ0eU5hbWUpIHtcbiAgICBpZiAobm9kZVtwcm9wZXJ0eU5hbWVdICE9PSB0aGlzLnZhbHVlKSB7XG4gICAgICAgIG5vZGVbcHJvcGVydHlOYW1lXSA9IHRoaXMudmFsdWU7XG4gICAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGlzQXJyYXkgPSByZXF1aXJlKCd4LWlzLWFycmF5Jyk7XG5cbnZhciBWTm9kZSA9IHJlcXVpcmUoJy4uL3Zub2RlL3Zub2RlLmpzJyk7XG52YXIgVlRleHQgPSByZXF1aXJlKCcuLi92bm9kZS92dGV4dC5qcycpO1xudmFyIGlzVk5vZGUgPSByZXF1aXJlKCcuLi92bm9kZS9pcy12bm9kZScpO1xudmFyIGlzVlRleHQgPSByZXF1aXJlKCcuLi92bm9kZS9pcy12dGV4dCcpO1xudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZSgnLi4vdm5vZGUvaXMtd2lkZ2V0Jyk7XG52YXIgaXNIb29rID0gcmVxdWlyZSgnLi4vdm5vZGUvaXMtdmhvb2snKTtcbnZhciBpc1ZUaHVuayA9IHJlcXVpcmUoJy4uL3Zub2RlL2lzLXRodW5rJyk7XG5cbnZhciBwYXJzZVRhZyA9IHJlcXVpcmUoJy4vcGFyc2UtdGFnLmpzJyk7XG52YXIgc29mdFNldEhvb2sgPSByZXF1aXJlKCcuL2hvb2tzL3NvZnQtc2V0LWhvb2suanMnKTtcbnZhciBldkhvb2sgPSByZXF1aXJlKCcuL2hvb2tzL2V2LWhvb2suanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBoO1xuXG5mdW5jdGlvbiBoKHRhZ05hbWUsIHByb3BlcnRpZXMsIGNoaWxkcmVuKSB7XG4gICAgdmFyIGNoaWxkTm9kZXMgPSBbXTtcbiAgICB2YXIgdGFnLCBwcm9wcywga2V5LCBuYW1lc3BhY2U7XG5cbiAgICBpZiAoIWNoaWxkcmVuICYmIGlzQ2hpbGRyZW4ocHJvcGVydGllcykpIHtcbiAgICAgICAgY2hpbGRyZW4gPSBwcm9wZXJ0aWVzO1xuICAgICAgICBwcm9wcyA9IHt9O1xuICAgIH1cblxuICAgIHByb3BzID0gcHJvcHMgfHwgcHJvcGVydGllcyB8fCB7fTtcbiAgICB0YWcgPSBwYXJzZVRhZyh0YWdOYW1lLCBwcm9wcyk7XG5cbiAgICAvLyBzdXBwb3J0IGtleXNcbiAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkoJ2tleScpKSB7XG4gICAgICAgIGtleSA9IHByb3BzLmtleTtcbiAgICAgICAgcHJvcHMua2V5ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIHN1cHBvcnQgbmFtZXNwYWNlXG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KCduYW1lc3BhY2UnKSkge1xuICAgICAgICBuYW1lc3BhY2UgPSBwcm9wcy5uYW1lc3BhY2U7XG4gICAgICAgIHByb3BzLm5hbWVzcGFjZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBmaXggY3Vyc29yIGJ1Z1xuICAgIGlmICh0YWcgPT09ICdJTlBVVCcgJiZcbiAgICAgICAgIW5hbWVzcGFjZSAmJlxuICAgICAgICBwcm9wcy5oYXNPd25Qcm9wZXJ0eSgndmFsdWUnKSAmJlxuICAgICAgICBwcm9wcy52YWx1ZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICFpc0hvb2socHJvcHMudmFsdWUpXG4gICAgKSB7XG4gICAgICAgIHByb3BzLnZhbHVlID0gc29mdFNldEhvb2socHJvcHMudmFsdWUpO1xuICAgIH1cblxuICAgIHRyYW5zZm9ybVByb3BlcnRpZXMocHJvcHMpO1xuXG4gICAgaWYgKGNoaWxkcmVuICE9PSB1bmRlZmluZWQgJiYgY2hpbGRyZW4gIT09IG51bGwpIHtcbiAgICAgICAgYWRkQ2hpbGQoY2hpbGRyZW4sIGNoaWxkTm9kZXMsIHRhZywgcHJvcHMpO1xuICAgIH1cblxuXG4gICAgcmV0dXJuIG5ldyBWTm9kZSh0YWcsIHByb3BzLCBjaGlsZE5vZGVzLCBrZXksIG5hbWVzcGFjZSk7XG59XG5cbmZ1bmN0aW9uIGFkZENoaWxkKGMsIGNoaWxkTm9kZXMsIHRhZywgcHJvcHMpIHtcbiAgICBpZiAodHlwZW9mIGMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIGNoaWxkTm9kZXMucHVzaChuZXcgVlRleHQoYykpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGMgPT09ICdudW1iZXInKSB7XG4gICAgICAgIGNoaWxkTm9kZXMucHVzaChuZXcgVlRleHQoU3RyaW5nKGMpKSk7XG4gICAgfSBlbHNlIGlmIChpc0NoaWxkKGMpKSB7XG4gICAgICAgIGNoaWxkTm9kZXMucHVzaChjKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkoYykpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhZGRDaGlsZChjW2ldLCBjaGlsZE5vZGVzLCB0YWcsIHByb3BzKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYyA9PT0gbnVsbCB8fCBjID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFVuZXhwZWN0ZWRWaXJ0dWFsRWxlbWVudCh7XG4gICAgICAgICAgICBmb3JlaWduT2JqZWN0OiBjLFxuICAgICAgICAgICAgcGFyZW50Vm5vZGU6IHtcbiAgICAgICAgICAgICAgICB0YWdOYW1lOiB0YWcsXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczogcHJvcHNcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiB0cmFuc2Zvcm1Qcm9wZXJ0aWVzKHByb3BzKSB7XG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KHByb3BOYW1lKSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gcHJvcHNbcHJvcE5hbWVdO1xuXG4gICAgICAgICAgICBpZiAoaXNIb29rKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocHJvcE5hbWUuc3Vic3RyKDAsIDMpID09PSAnZXYtJykge1xuICAgICAgICAgICAgICAgIC8vIGFkZCBldi1mb28gc3VwcG9ydFxuICAgICAgICAgICAgICAgIHByb3BzW3Byb3BOYW1lXSA9IGV2SG9vayh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGlzQ2hpbGQoeCkge1xuICAgIHJldHVybiBpc1ZOb2RlKHgpIHx8IGlzVlRleHQoeCkgfHwgaXNXaWRnZXQoeCkgfHwgaXNWVGh1bmsoeCk7XG59XG5cbmZ1bmN0aW9uIGlzQ2hpbGRyZW4oeCkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ3N0cmluZycgfHwgaXNBcnJheSh4KSB8fCBpc0NoaWxkKHgpO1xufVxuXG5mdW5jdGlvbiBVbmV4cGVjdGVkVmlydHVhbEVsZW1lbnQoZGF0YSkge1xuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcblxuICAgIGVyci50eXBlID0gJ3ZpcnR1YWwtaHlwZXJzY3JpcHQudW5leHBlY3RlZC52aXJ0dWFsLWVsZW1lbnQnO1xuICAgIGVyci5tZXNzYWdlID0gJ1VuZXhwZWN0ZWQgdmlydHVhbCBjaGlsZCBwYXNzZWQgdG8gaCgpLlxcbicgK1xuICAgICAgICAnRXhwZWN0ZWQgYSBWTm9kZSAvIFZ0aHVuayAvIFZXaWRnZXQgLyBzdHJpbmcgYnV0OlxcbicgK1xuICAgICAgICAnZ290OlxcbicgK1xuICAgICAgICBlcnJvclN0cmluZyhkYXRhLmZvcmVpZ25PYmplY3QpICtcbiAgICAgICAgJy5cXG4nICtcbiAgICAgICAgJ1RoZSBwYXJlbnQgdm5vZGUgaXM6XFxuJyArXG4gICAgICAgIGVycm9yU3RyaW5nKGRhdGEucGFyZW50Vm5vZGUpXG4gICAgICAgICdcXG4nICtcbiAgICAgICAgJ1N1Z2dlc3RlZCBmaXg6IGNoYW5nZSB5b3VyIGBoKC4uLiwgWyAuLi4gXSlgIGNhbGxzaXRlLic7XG4gICAgZXJyLmZvcmVpZ25PYmplY3QgPSBkYXRhLmZvcmVpZ25PYmplY3Q7XG4gICAgZXJyLnBhcmVudFZub2RlID0gZGF0YS5wYXJlbnRWbm9kZTtcblxuICAgIHJldHVybiBlcnI7XG59XG5cbmZ1bmN0aW9uIGVycm9yU3RyaW5nKG9iaikge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvYmosIG51bGwsICcgICAgJyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nKG9iaik7XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc3BsaXQgPSByZXF1aXJlKCdicm93c2VyLXNwbGl0Jyk7XG5cbnZhciBjbGFzc0lkU3BsaXQgPSAvKFtcXC4jXT9bYS16QS1aMC05XFx1MDA3Ri1cXHVGRkZGXzotXSspLztcbnZhciBub3RDbGFzc0lkID0gL15cXC58Iy87XG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2VUYWc7XG5cbmZ1bmN0aW9uIHBhcnNlVGFnKHRhZywgcHJvcHMpIHtcbiAgICBpZiAoIXRhZykge1xuICAgICAgICByZXR1cm4gJ0RJVic7XG4gICAgfVxuXG4gICAgdmFyIG5vSWQgPSAhKHByb3BzLmhhc093blByb3BlcnR5KCdpZCcpKTtcblxuICAgIHZhciB0YWdQYXJ0cyA9IHNwbGl0KHRhZywgY2xhc3NJZFNwbGl0KTtcbiAgICB2YXIgdGFnTmFtZSA9IG51bGw7XG5cbiAgICBpZiAobm90Q2xhc3NJZC50ZXN0KHRhZ1BhcnRzWzFdKSkge1xuICAgICAgICB0YWdOYW1lID0gJ0RJVic7XG4gICAgfVxuXG4gICAgdmFyIGNsYXNzZXMsIHBhcnQsIHR5cGUsIGk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgdGFnUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFydCA9IHRhZ1BhcnRzW2ldO1xuXG4gICAgICAgIGlmICghcGFydCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB0eXBlID0gcGFydC5jaGFyQXQoMCk7XG5cbiAgICAgICAgaWYgKCF0YWdOYW1lKSB7XG4gICAgICAgICAgICB0YWdOYW1lID0gcGFydDtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnLicpIHtcbiAgICAgICAgICAgIGNsYXNzZXMgPSBjbGFzc2VzIHx8IFtdO1xuICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJyMnICYmIG5vSWQpIHtcbiAgICAgICAgICAgIHByb3BzLmlkID0gcGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNsYXNzZXMpIHtcbiAgICAgICAgaWYgKHByb3BzLmNsYXNzTmFtZSkge1xuICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKHByb3BzLmNsYXNzTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9wcy5jbGFzc05hbWUgPSBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvcHMubmFtZXNwYWNlID8gdGFnTmFtZSA6IHRhZ05hbWUudG9VcHBlckNhc2UoKTtcbn1cbiIsInZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4vaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVGh1bmsgPSByZXF1aXJlKFwiLi9pcy10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhhbmRsZVRodW5rXG5cbmZ1bmN0aW9uIGhhbmRsZVRodW5rKGEsIGIpIHtcbiAgICB2YXIgcmVuZGVyZWRBID0gYVxuICAgIHZhciByZW5kZXJlZEIgPSBiXG5cbiAgICBpZiAoaXNUaHVuayhiKSkge1xuICAgICAgICByZW5kZXJlZEIgPSByZW5kZXJUaHVuayhiLCBhKVxuICAgIH1cblxuICAgIGlmIChpc1RodW5rKGEpKSB7XG4gICAgICAgIHJlbmRlcmVkQSA9IHJlbmRlclRodW5rKGEsIG51bGwpXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgYTogcmVuZGVyZWRBLFxuICAgICAgICBiOiByZW5kZXJlZEJcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlclRodW5rKHRodW5rLCBwcmV2aW91cykge1xuICAgIHZhciByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGVcblxuICAgIGlmICghcmVuZGVyZWRUaHVuaykge1xuICAgICAgICByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGUgPSB0aHVuay5yZW5kZXIocHJldmlvdXMpXG4gICAgfVxuXG4gICAgaWYgKCEoaXNWTm9kZShyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNWVGV4dChyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNXaWRnZXQocmVuZGVyZWRUaHVuaykpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRodW5rIGRpZCBub3QgcmV0dXJuIGEgdmFsaWQgbm9kZVwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVuZGVyZWRUaHVua1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc1RodW5rXHJcblxyXG5mdW5jdGlvbiBpc1RodW5rKHQpIHtcclxuICAgIHJldHVybiB0ICYmIHQudHlwZSA9PT0gXCJUaHVua1wiXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc0hvb2tcblxuZnVuY3Rpb24gaXNIb29rKGhvb2spIHtcbiAgICByZXR1cm4gaG9vayAmJlxuICAgICAgKHR5cGVvZiBob29rLmhvb2sgPT09IFwiZnVuY3Rpb25cIiAmJiAhaG9vay5oYXNPd25Qcm9wZXJ0eShcImhvb2tcIikgfHxcbiAgICAgICB0eXBlb2YgaG9vay51bmhvb2sgPT09IFwiZnVuY3Rpb25cIiAmJiAhaG9vay5oYXNPd25Qcm9wZXJ0eShcInVuaG9va1wiKSlcbn1cbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzVmlydHVhbE5vZGVcblxuZnVuY3Rpb24gaXNWaXJ0dWFsTm9kZSh4KSB7XG4gICAgcmV0dXJuIHggJiYgeC50eXBlID09PSBcIlZpcnR1YWxOb2RlXCIgJiYgeC52ZXJzaW9uID09PSB2ZXJzaW9uXG59XG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBpc1ZpcnR1YWxUZXh0XG5cbmZ1bmN0aW9uIGlzVmlydHVhbFRleHQoeCkge1xuICAgIHJldHVybiB4ICYmIHgudHlwZSA9PT0gXCJWaXJ0dWFsVGV4dFwiICYmIHgudmVyc2lvbiA9PT0gdmVyc2lvblxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc1dpZGdldFxuXG5mdW5jdGlvbiBpc1dpZGdldCh3KSB7XG4gICAgcmV0dXJuIHcgJiYgdy50eXBlID09PSBcIldpZGdldFwiXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFwiMlwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVGh1bmsgPSByZXF1aXJlKFwiLi9pcy10aHVua1wiKVxudmFyIGlzVkhvb2sgPSByZXF1aXJlKFwiLi9pcy12aG9va1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxOb2RlXG5cbnZhciBub1Byb3BlcnRpZXMgPSB7fVxudmFyIG5vQ2hpbGRyZW4gPSBbXVxuXG5mdW5jdGlvbiBWaXJ0dWFsTm9kZSh0YWdOYW1lLCBwcm9wZXJ0aWVzLCBjaGlsZHJlbiwga2V5LCBuYW1lc3BhY2UpIHtcbiAgICB0aGlzLnRhZ05hbWUgPSB0YWdOYW1lXG4gICAgdGhpcy5wcm9wZXJ0aWVzID0gcHJvcGVydGllcyB8fCBub1Byb3BlcnRpZXNcbiAgICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW4gfHwgbm9DaGlsZHJlblxuICAgIHRoaXMua2V5ID0ga2V5ICE9IG51bGwgPyBTdHJpbmcoa2V5KSA6IHVuZGVmaW5lZFxuICAgIHRoaXMubmFtZXNwYWNlID0gKHR5cGVvZiBuYW1lc3BhY2UgPT09IFwic3RyaW5nXCIpID8gbmFtZXNwYWNlIDogbnVsbFxuXG4gICAgdmFyIGNvdW50ID0gKGNoaWxkcmVuICYmIGNoaWxkcmVuLmxlbmd0aCkgfHwgMFxuICAgIHZhciBkZXNjZW5kYW50cyA9IDBcbiAgICB2YXIgaGFzV2lkZ2V0cyA9IGZhbHNlXG4gICAgdmFyIGhhc1RodW5rcyA9IGZhbHNlXG4gICAgdmFyIGRlc2NlbmRhbnRIb29rcyA9IGZhbHNlXG4gICAgdmFyIGhvb2tzXG5cbiAgICBmb3IgKHZhciBwcm9wTmFtZSBpbiBwcm9wZXJ0aWVzKSB7XG4gICAgICAgIGlmIChwcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KHByb3BOYW1lKSkge1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5ID0gcHJvcGVydGllc1twcm9wTmFtZV1cbiAgICAgICAgICAgIGlmIChpc1ZIb29rKHByb3BlcnR5KSAmJiBwcm9wZXJ0eS51bmhvb2spIHtcbiAgICAgICAgICAgICAgICBpZiAoIWhvb2tzKSB7XG4gICAgICAgICAgICAgICAgICAgIGhvb2tzID0ge31cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBob29rc1twcm9wTmFtZV0gPSBwcm9wZXJ0eVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSkge1xuICAgICAgICAgICAgZGVzY2VuZGFudHMgKz0gY2hpbGQuY291bnQgfHwgMFxuXG4gICAgICAgICAgICBpZiAoIWhhc1dpZGdldHMgJiYgY2hpbGQuaGFzV2lkZ2V0cykge1xuICAgICAgICAgICAgICAgIGhhc1dpZGdldHMgPSB0cnVlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaGFzVGh1bmtzICYmIGNoaWxkLmhhc1RodW5rcykge1xuICAgICAgICAgICAgICAgIGhhc1RodW5rcyA9IHRydWVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFkZXNjZW5kYW50SG9va3MgJiYgKGNoaWxkLmhvb2tzIHx8IGNoaWxkLmRlc2NlbmRhbnRIb29rcykpIHtcbiAgICAgICAgICAgICAgICBkZXNjZW5kYW50SG9va3MgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWhhc1dpZGdldHMgJiYgaXNXaWRnZXQoY2hpbGQpKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNoaWxkLmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgIGhhc1dpZGdldHMgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWhhc1RodW5rcyAmJiBpc1RodW5rKGNoaWxkKSkge1xuICAgICAgICAgICAgaGFzVGh1bmtzID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY291bnQgPSBjb3VudCArIGRlc2NlbmRhbnRzXG4gICAgdGhpcy5oYXNXaWRnZXRzID0gaGFzV2lkZ2V0c1xuICAgIHRoaXMuaGFzVGh1bmtzID0gaGFzVGh1bmtzXG4gICAgdGhpcy5ob29rcyA9IGhvb2tzXG4gICAgdGhpcy5kZXNjZW5kYW50SG9va3MgPSBkZXNjZW5kYW50SG9va3Ncbn1cblxuVmlydHVhbE5vZGUucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsTm9kZS5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbE5vZGVcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cblZpcnR1YWxQYXRjaC5OT05FID0gMFxuVmlydHVhbFBhdGNoLlZURVhUID0gMVxuVmlydHVhbFBhdGNoLlZOT0RFID0gMlxuVmlydHVhbFBhdGNoLldJREdFVCA9IDNcblZpcnR1YWxQYXRjaC5QUk9QUyA9IDRcblZpcnR1YWxQYXRjaC5PUkRFUiA9IDVcblZpcnR1YWxQYXRjaC5JTlNFUlQgPSA2XG5WaXJ0dWFsUGF0Y2guUkVNT1ZFID0gN1xuVmlydHVhbFBhdGNoLlRIVU5LID0gOFxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxQYXRjaFxuXG5mdW5jdGlvbiBWaXJ0dWFsUGF0Y2godHlwZSwgdk5vZGUsIHBhdGNoKSB7XG4gICAgdGhpcy50eXBlID0gTnVtYmVyKHR5cGUpXG4gICAgdGhpcy52Tm9kZSA9IHZOb2RlXG4gICAgdGhpcy5wYXRjaCA9IHBhdGNoXG59XG5cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbFBhdGNoXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxUZXh0XG5cbmZ1bmN0aW9uIFZpcnR1YWxUZXh0KHRleHQpIHtcbiAgICB0aGlzLnRleHQgPSBTdHJpbmcodGV4dClcbn1cblxuVmlydHVhbFRleHQucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsVGV4dC5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbFRleHRcIlxuIiwidmFyIGlzT2JqZWN0ID0gcmVxdWlyZShcImlzLW9iamVjdFwiKVxudmFyIGlzSG9vayA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy12aG9va1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRpZmZQcm9wc1xuXG5mdW5jdGlvbiBkaWZmUHJvcHMoYSwgYikge1xuICAgIHZhciBkaWZmXG5cbiAgICBmb3IgKHZhciBhS2V5IGluIGEpIHtcbiAgICAgICAgaWYgKCEoYUtleSBpbiBiKSkge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYUtleV0gPSB1bmRlZmluZWRcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhVmFsdWUgPSBhW2FLZXldXG4gICAgICAgIHZhciBiVmFsdWUgPSBiW2FLZXldXG5cbiAgICAgICAgaWYgKGFWYWx1ZSA9PT0gYlZhbHVlKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KGFWYWx1ZSkgJiYgaXNPYmplY3QoYlZhbHVlKSkge1xuICAgICAgICAgICAgaWYgKGdldFByb3RvdHlwZShiVmFsdWUpICE9PSBnZXRQcm90b3R5cGUoYVZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0hvb2soYlZhbHVlKSkge1xuICAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBvYmplY3REaWZmID0gZGlmZlByb3BzKGFWYWx1ZSwgYlZhbHVlKVxuICAgICAgICAgICAgICAgIGlmIChvYmplY3REaWZmKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBvYmplY3REaWZmXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGJLZXkgaW4gYikge1xuICAgICAgICBpZiAoIShiS2V5IGluIGEpKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZltiS2V5XSA9IGJbYktleV1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkaWZmXG59XG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZSh2YWx1ZSkge1xuICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSlcbiAgfSBlbHNlIGlmICh2YWx1ZS5fX3Byb3RvX18pIHtcbiAgICByZXR1cm4gdmFsdWUuX19wcm90b19fXG4gIH0gZWxzZSBpZiAodmFsdWUuY29uc3RydWN0b3IpIHtcbiAgICByZXR1cm4gdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlXG4gIH1cbn1cbiIsInZhciBpc0FycmF5ID0gcmVxdWlyZShcIngtaXMtYXJyYXlcIilcblxudmFyIFZQYXRjaCA9IHJlcXVpcmUoXCIuLi92bm9kZS92cGF0Y2hcIilcbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXdpZGdldFwiKVxudmFyIGlzVGh1bmsgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdGh1bmtcIilcbnZhciBoYW5kbGVUaHVuayA9IHJlcXVpcmUoXCIuLi92bm9kZS9oYW5kbGUtdGh1bmtcIilcblxudmFyIGRpZmZQcm9wcyA9IHJlcXVpcmUoXCIuL2RpZmYtcHJvcHNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBkaWZmXG5cbmZ1bmN0aW9uIGRpZmYoYSwgYikge1xuICAgIHZhciBwYXRjaCA9IHsgYTogYSB9XG4gICAgd2FsayhhLCBiLCBwYXRjaCwgMClcbiAgICByZXR1cm4gcGF0Y2hcbn1cblxuZnVuY3Rpb24gd2FsayhhLCBiLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoYSA9PT0gYikge1xuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgYXBwbHkgPSBwYXRjaFtpbmRleF1cbiAgICB2YXIgYXBwbHlDbGVhciA9IGZhbHNlXG5cbiAgICBpZiAoaXNUaHVuayhhKSB8fCBpc1RodW5rKGIpKSB7XG4gICAgICAgIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpXG4gICAgfSBlbHNlIGlmIChiID09IG51bGwpIHtcblxuICAgICAgICAvLyBJZiBhIGlzIGEgd2lkZ2V0IHdlIHdpbGwgYWRkIGEgcmVtb3ZlIHBhdGNoIGZvciBpdFxuICAgICAgICAvLyBPdGhlcndpc2UgYW55IGNoaWxkIHdpZGdldHMvaG9va3MgbXVzdCBiZSBkZXN0cm95ZWQuXG4gICAgICAgIC8vIFRoaXMgcHJldmVudHMgYWRkaW5nIHR3byByZW1vdmUgcGF0Y2hlcyBmb3IgYSB3aWRnZXQuXG4gICAgICAgIGlmICghaXNXaWRnZXQoYSkpIHtcbiAgICAgICAgICAgIGNsZWFyU3RhdGUoYSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICAgICAgYXBwbHkgPSBwYXRjaFtpbmRleF1cbiAgICAgICAgfVxuXG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgYSwgYikpXG4gICAgfSBlbHNlIGlmIChpc1ZOb2RlKGIpKSB7XG4gICAgICAgIGlmIChpc1ZOb2RlKGEpKSB7XG4gICAgICAgICAgICBpZiAoYS50YWdOYW1lID09PSBiLnRhZ05hbWUgJiZcbiAgICAgICAgICAgICAgICBhLm5hbWVzcGFjZSA9PT0gYi5uYW1lc3BhY2UgJiZcbiAgICAgICAgICAgICAgICBhLmtleSA9PT0gYi5rZXkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvcHNQYXRjaCA9IGRpZmZQcm9wcyhhLnByb3BlcnRpZXMsIGIucHJvcGVydGllcylcbiAgICAgICAgICAgICAgICBpZiAocHJvcHNQYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guUFJPUFMsIGEsIHByb3BzUGF0Y2gpKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhcHBseSA9IGRpZmZDaGlsZHJlbihhLCBiLCBwYXRjaCwgYXBwbHksIGluZGV4KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WTk9ERSwgYSwgYikpXG4gICAgICAgICAgICAgICAgYXBwbHlDbGVhciA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZOT0RFLCBhLCBiKSlcbiAgICAgICAgICAgIGFwcGx5Q2xlYXIgPSB0cnVlXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVlRleHQoYikpIHtcbiAgICAgICAgaWYgKCFpc1ZUZXh0KGEpKSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WVEVYVCwgYSwgYikpXG4gICAgICAgICAgICBhcHBseUNsZWFyID0gdHJ1ZVxuICAgICAgICB9IGVsc2UgaWYgKGEudGV4dCAhPT0gYi50ZXh0KSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WVEVYVCwgYSwgYikpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzV2lkZ2V0KGIpKSB7XG4gICAgICAgIGlmICghaXNXaWRnZXQoYSkpIHtcbiAgICAgICAgICAgIGFwcGx5Q2xlYXIgPSB0cnVlXG4gICAgICAgIH1cblxuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5XSURHRVQsIGEsIGIpKVxuICAgIH1cblxuICAgIGlmIChhcHBseSkge1xuICAgICAgICBwYXRjaFtpbmRleF0gPSBhcHBseVxuICAgIH1cblxuICAgIGlmIChhcHBseUNsZWFyKSB7XG4gICAgICAgIGNsZWFyU3RhdGUoYSwgcGF0Y2gsIGluZGV4KVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZGlmZkNoaWxkcmVuKGEsIGIsIHBhdGNoLCBhcHBseSwgaW5kZXgpIHtcbiAgICB2YXIgYUNoaWxkcmVuID0gYS5jaGlsZHJlblxuICAgIHZhciBvcmRlcmVkU2V0ID0gcmVvcmRlcihhQ2hpbGRyZW4sIGIuY2hpbGRyZW4pXG4gICAgdmFyIGJDaGlsZHJlbiA9IG9yZGVyZWRTZXQuY2hpbGRyZW5cblxuICAgIHZhciBhTGVuID0gYUNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBiTGVuID0gYkNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBsZW4gPSBhTGVuID4gYkxlbiA/IGFMZW4gOiBiTGVuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBsZWZ0Tm9kZSA9IGFDaGlsZHJlbltpXVxuICAgICAgICB2YXIgcmlnaHROb2RlID0gYkNoaWxkcmVuW2ldXG4gICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICBpZiAoIWxlZnROb2RlKSB7XG4gICAgICAgICAgICBpZiAocmlnaHROb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhjZXNzIG5vZGVzIGluIGIgbmVlZCB0byBiZSBhZGRlZFxuICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLklOU0VSVCwgbnVsbCwgcmlnaHROb2RlKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdhbGsobGVmdE5vZGUsIHJpZ2h0Tm9kZSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzVk5vZGUobGVmdE5vZGUpICYmIGxlZnROb2RlLmNvdW50KSB7XG4gICAgICAgICAgICBpbmRleCArPSBsZWZ0Tm9kZS5jb3VudFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9yZGVyZWRTZXQubW92ZXMpIHtcbiAgICAgICAgLy8gUmVvcmRlciBub2RlcyBsYXN0XG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goXG4gICAgICAgICAgICBWUGF0Y2guT1JERVIsXG4gICAgICAgICAgICBhLFxuICAgICAgICAgICAgb3JkZXJlZFNldC5tb3Zlc1xuICAgICAgICApKVxuICAgIH1cblxuICAgIHJldHVybiBhcHBseVxufVxuXG5mdW5jdGlvbiBjbGVhclN0YXRlKHZOb2RlLCBwYXRjaCwgaW5kZXgpIHtcbiAgICAvLyBUT0RPOiBNYWtlIHRoaXMgYSBzaW5nbGUgd2Fsaywgbm90IHR3b1xuICAgIHVuaG9vayh2Tm9kZSwgcGF0Y2gsIGluZGV4KVxuICAgIGRlc3Ryb3lXaWRnZXRzKHZOb2RlLCBwYXRjaCwgaW5kZXgpXG59XG5cbi8vIFBhdGNoIHJlY29yZHMgZm9yIGFsbCBkZXN0cm95ZWQgd2lkZ2V0cyBtdXN0IGJlIGFkZGVkIGJlY2F1c2Ugd2UgbmVlZFxuLy8gYSBET00gbm9kZSByZWZlcmVuY2UgZm9yIHRoZSBkZXN0cm95IGZ1bmN0aW9uXG5mdW5jdGlvbiBkZXN0cm95V2lkZ2V0cyh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGlzV2lkZ2V0KHZOb2RlKSkge1xuICAgICAgICBpZiAodHlwZW9mIHZOb2RlLmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gYXBwZW5kUGF0Y2goXG4gICAgICAgICAgICAgICAgcGF0Y2hbaW5kZXhdLFxuICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgdk5vZGUsIG51bGwpXG4gICAgICAgICAgICApXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVk5vZGUodk5vZGUpICYmICh2Tm9kZS5oYXNXaWRnZXRzIHx8IHZOb2RlLmhhc1RodW5rcykpIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gdk5vZGUuY2hpbGRyZW5cbiAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhjaGlsZCwgcGF0Y2gsIGluZGV4KVxuXG4gICAgICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkgJiYgY2hpbGQuY291bnQpIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSBjaGlsZC5jb3VudFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1RodW5rKHZOb2RlKSkge1xuICAgICAgICB0aHVua3Modk5vZGUsIG51bGwsIHBhdGNoLCBpbmRleClcbiAgICB9XG59XG5cbi8vIENyZWF0ZSBhIHN1Yi1wYXRjaCBmb3IgdGh1bmtzXG5mdW5jdGlvbiB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KSB7XG4gICAgdmFyIG5vZGVzID0gaGFuZGxlVGh1bmsoYSwgYilcbiAgICB2YXIgdGh1bmtQYXRjaCA9IGRpZmYobm9kZXMuYSwgbm9kZXMuYilcbiAgICBpZiAoaGFzUGF0Y2hlcyh0aHVua1BhdGNoKSkge1xuICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5USFVOSywgbnVsbCwgdGh1bmtQYXRjaClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhc1BhdGNoZXMocGF0Y2gpIHtcbiAgICBmb3IgKHZhciBpbmRleCBpbiBwYXRjaCkge1xuICAgICAgICBpZiAoaW5kZXggIT09IFwiYVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlXG59XG5cbi8vIEV4ZWN1dGUgaG9va3Mgd2hlbiB0d28gbm9kZXMgYXJlIGlkZW50aWNhbFxuZnVuY3Rpb24gdW5ob29rKHZOb2RlLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaXNWTm9kZSh2Tm9kZSkpIHtcbiAgICAgICAgaWYgKHZOb2RlLmhvb2tzKSB7XG4gICAgICAgICAgICBwYXRjaFtpbmRleF0gPSBhcHBlbmRQYXRjaChcbiAgICAgICAgICAgICAgICBwYXRjaFtpbmRleF0sXG4gICAgICAgICAgICAgICAgbmV3IFZQYXRjaChcbiAgICAgICAgICAgICAgICAgICAgVlBhdGNoLlBST1BTLFxuICAgICAgICAgICAgICAgICAgICB2Tm9kZSxcbiAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkS2V5cyh2Tm9kZS5ob29rcylcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodk5vZGUuZGVzY2VuZGFudEhvb2tzIHx8IHZOb2RlLmhhc1RodW5rcykge1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gdk5vZGUuY2hpbGRyZW5cbiAgICAgICAgICAgIHZhciBsZW4gPSBjaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICAgICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICAgICAgICAgIHVuaG9vayhjaGlsZCwgcGF0Y2gsIGluZGV4KVxuXG4gICAgICAgICAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpICYmIGNoaWxkLmNvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IGNoaWxkLmNvdW50XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1RodW5rKHZOb2RlKSkge1xuICAgICAgICB0aHVua3Modk5vZGUsIG51bGwsIHBhdGNoLCBpbmRleClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHVuZGVmaW5lZEtleXMob2JqKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdW5kZWZpbmVkXG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdFxufVxuXG4vLyBMaXN0IGRpZmYsIG5haXZlIGxlZnQgdG8gcmlnaHQgcmVvcmRlcmluZ1xuZnVuY3Rpb24gcmVvcmRlcihhQ2hpbGRyZW4sIGJDaGlsZHJlbikge1xuICAgIC8vIE8oTSkgdGltZSwgTyhNKSBtZW1vcnlcbiAgICB2YXIgYkNoaWxkSW5kZXggPSBrZXlJbmRleChiQ2hpbGRyZW4pXG4gICAgdmFyIGJLZXlzID0gYkNoaWxkSW5kZXgua2V5c1xuICAgIHZhciBiRnJlZSA9IGJDaGlsZEluZGV4LmZyZWVcblxuICAgIGlmIChiRnJlZS5sZW5ndGggPT09IGJDaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoaWxkcmVuOiBiQ2hpbGRyZW4sXG4gICAgICAgICAgICBtb3ZlczogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTyhOKSB0aW1lLCBPKE4pIG1lbW9yeVxuICAgIHZhciBhQ2hpbGRJbmRleCA9IGtleUluZGV4KGFDaGlsZHJlbilcbiAgICB2YXIgYUtleXMgPSBhQ2hpbGRJbmRleC5rZXlzXG4gICAgdmFyIGFGcmVlID0gYUNoaWxkSW5kZXguZnJlZVxuXG4gICAgaWYgKGFGcmVlLmxlbmd0aCA9PT0gYUNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hpbGRyZW46IGJDaGlsZHJlbixcbiAgICAgICAgICAgIG1vdmVzOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPKE1BWChOLCBNKSkgbWVtb3J5XG4gICAgdmFyIG5ld0NoaWxkcmVuID0gW11cblxuICAgIHZhciBmcmVlSW5kZXggPSAwXG4gICAgdmFyIGZyZWVDb3VudCA9IGJGcmVlLmxlbmd0aFxuICAgIHZhciBkZWxldGVkSXRlbXMgPSAwXG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggYSBhbmQgbWF0Y2ggYSBub2RlIGluIGJcbiAgICAvLyBPKE4pIHRpbWUsXG4gICAgZm9yICh2YXIgaSA9IDAgOyBpIDwgYUNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBhSXRlbSA9IGFDaGlsZHJlbltpXVxuICAgICAgICB2YXIgaXRlbUluZGV4XG5cbiAgICAgICAgaWYgKGFJdGVtLmtleSkge1xuICAgICAgICAgICAgaWYgKGJLZXlzLmhhc093blByb3BlcnR5KGFJdGVtLmtleSkpIHtcbiAgICAgICAgICAgICAgICAvLyBNYXRjaCB1cCB0aGUgb2xkIGtleXNcbiAgICAgICAgICAgICAgICBpdGVtSW5kZXggPSBiS2V5c1thSXRlbS5rZXldXG4gICAgICAgICAgICAgICAgbmV3Q2hpbGRyZW4ucHVzaChiQ2hpbGRyZW5baXRlbUluZGV4XSlcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgb2xkIGtleWVkIGl0ZW1zXG4gICAgICAgICAgICAgICAgaXRlbUluZGV4ID0gaSAtIGRlbGV0ZWRJdGVtcysrXG4gICAgICAgICAgICAgICAgbmV3Q2hpbGRyZW4ucHVzaChudWxsKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTWF0Y2ggdGhlIGl0ZW0gaW4gYSB3aXRoIHRoZSBuZXh0IGZyZWUgaXRlbSBpbiBiXG4gICAgICAgICAgICBpZiAoZnJlZUluZGV4IDwgZnJlZUNvdW50KSB7XG4gICAgICAgICAgICAgICAgaXRlbUluZGV4ID0gYkZyZWVbZnJlZUluZGV4KytdXG4gICAgICAgICAgICAgICAgbmV3Q2hpbGRyZW4ucHVzaChiQ2hpbGRyZW5baXRlbUluZGV4XSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVGhlcmUgYXJlIG5vIGZyZWUgaXRlbXMgaW4gYiB0byBtYXRjaCB3aXRoXG4gICAgICAgICAgICAgICAgLy8gdGhlIGZyZWUgaXRlbXMgaW4gYSwgc28gdGhlIGV4dHJhIGZyZWUgbm9kZXNcbiAgICAgICAgICAgICAgICAvLyBhcmUgZGVsZXRlZC5cbiAgICAgICAgICAgICAgICBpdGVtSW5kZXggPSBpIC0gZGVsZXRlZEl0ZW1zKytcbiAgICAgICAgICAgICAgICBuZXdDaGlsZHJlbi5wdXNoKG51bGwpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgbGFzdEZyZWVJbmRleCA9IGZyZWVJbmRleCA+PSBiRnJlZS5sZW5ndGggP1xuICAgICAgICBiQ2hpbGRyZW4ubGVuZ3RoIDpcbiAgICAgICAgYkZyZWVbZnJlZUluZGV4XVxuXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGIgYW5kIGFwcGVuZCBhbnkgbmV3IGtleXNcbiAgICAvLyBPKE0pIHRpbWVcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGJDaGlsZHJlbi5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgbmV3SXRlbSA9IGJDaGlsZHJlbltqXVxuXG4gICAgICAgIGlmIChuZXdJdGVtLmtleSkge1xuICAgICAgICAgICAgaWYgKCFhS2V5cy5oYXNPd25Qcm9wZXJ0eShuZXdJdGVtLmtleSkpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgYW55IG5ldyBrZXllZCBpdGVtc1xuICAgICAgICAgICAgICAgIC8vIFdlIGFyZSBhZGRpbmcgbmV3IGl0ZW1zIHRvIHRoZSBlbmQgYW5kIHRoZW4gc29ydGluZyB0aGVtXG4gICAgICAgICAgICAgICAgLy8gaW4gcGxhY2UuIEluIGZ1dHVyZSB3ZSBzaG91bGQgaW5zZXJ0IG5ldyBpdGVtcyBpbiBwbGFjZS5cbiAgICAgICAgICAgICAgICBuZXdDaGlsZHJlbi5wdXNoKG5ld0l0ZW0pXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoaiA+PSBsYXN0RnJlZUluZGV4KSB7XG4gICAgICAgICAgICAvLyBBZGQgYW55IGxlZnRvdmVyIG5vbi1rZXllZCBpdGVtc1xuICAgICAgICAgICAgbmV3Q2hpbGRyZW4ucHVzaChuZXdJdGVtKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHNpbXVsYXRlID0gbmV3Q2hpbGRyZW4uc2xpY2UoKVxuICAgIHZhciBzaW11bGF0ZUluZGV4ID0gMFxuICAgIHZhciByZW1vdmVzID0gW11cbiAgICB2YXIgaW5zZXJ0cyA9IFtdXG4gICAgdmFyIHNpbXVsYXRlSXRlbVxuXG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBiQ2hpbGRyZW4ubGVuZ3RoOykge1xuICAgICAgICB2YXIgd2FudGVkSXRlbSA9IGJDaGlsZHJlbltrXVxuICAgICAgICBzaW11bGF0ZUl0ZW0gPSBzaW11bGF0ZVtzaW11bGF0ZUluZGV4XVxuXG4gICAgICAgIC8vIHJlbW92ZSBpdGVtc1xuICAgICAgICB3aGlsZSAoc2ltdWxhdGVJdGVtID09PSBudWxsICYmIHNpbXVsYXRlLmxlbmd0aCkge1xuICAgICAgICAgICAgcmVtb3Zlcy5wdXNoKHJlbW92ZShzaW11bGF0ZSwgc2ltdWxhdGVJbmRleCwgbnVsbCkpXG4gICAgICAgICAgICBzaW11bGF0ZUl0ZW0gPSBzaW11bGF0ZVtzaW11bGF0ZUluZGV4XVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFzaW11bGF0ZUl0ZW0gfHwgc2ltdWxhdGVJdGVtLmtleSAhPT0gd2FudGVkSXRlbS5rZXkpIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIG5lZWQgYSBrZXkgaW4gdGhpcyBwb3NpdGlvbi4uLlxuICAgICAgICAgICAgaWYgKHdhbnRlZEl0ZW0ua2V5KSB7XG4gICAgICAgICAgICAgICAgaWYgKHNpbXVsYXRlSXRlbSAmJiBzaW11bGF0ZUl0ZW0ua2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGlmIGFuIGluc2VydCBkb2Vzbid0IHB1dCB0aGlzIGtleSBpbiBwbGFjZSwgaXQgbmVlZHMgdG8gbW92ZVxuICAgICAgICAgICAgICAgICAgICBpZiAoYktleXNbc2ltdWxhdGVJdGVtLmtleV0gIT09IGsgKyAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVzLnB1c2gocmVtb3ZlKHNpbXVsYXRlLCBzaW11bGF0ZUluZGV4LCBzaW11bGF0ZUl0ZW0ua2V5KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpbXVsYXRlSXRlbSA9IHNpbXVsYXRlW3NpbXVsYXRlSW5kZXhdXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiB0aGUgcmVtb3ZlIGRpZG4ndCBwdXQgdGhlIHdhbnRlZCBpdGVtIGluIHBsYWNlLCB3ZSBuZWVkIHRvIGluc2VydCBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzaW11bGF0ZUl0ZW0gfHwgc2ltdWxhdGVJdGVtLmtleSAhPT0gd2FudGVkSXRlbS5rZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRzLnB1c2goe2tleTogd2FudGVkSXRlbS5rZXksIHRvOiBrfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0ZW1zIGFyZSBtYXRjaGluZywgc28gc2tpcCBhaGVhZFxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2ltdWxhdGVJbmRleCsrXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnNlcnRzLnB1c2goe2tleTogd2FudGVkSXRlbS5rZXksIHRvOiBrfSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zZXJ0cy5wdXNoKHtrZXk6IHdhbnRlZEl0ZW0ua2V5LCB0bzoga30pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGsrK1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gYSBrZXkgaW4gc2ltdWxhdGUgaGFzIG5vIG1hdGNoaW5nIHdhbnRlZCBrZXksIHJlbW92ZSBpdFxuICAgICAgICAgICAgZWxzZSBpZiAoc2ltdWxhdGVJdGVtICYmIHNpbXVsYXRlSXRlbS5rZXkpIHtcbiAgICAgICAgICAgICAgICByZW1vdmVzLnB1c2gocmVtb3ZlKHNpbXVsYXRlLCBzaW11bGF0ZUluZGV4LCBzaW11bGF0ZUl0ZW0ua2V5KSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNpbXVsYXRlSW5kZXgrK1xuICAgICAgICAgICAgaysrXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZW1vdmUgYWxsIHRoZSByZW1haW5pbmcgbm9kZXMgZnJvbSBzaW11bGF0ZVxuICAgIHdoaWxlKHNpbXVsYXRlSW5kZXggPCBzaW11bGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgc2ltdWxhdGVJdGVtID0gc2ltdWxhdGVbc2ltdWxhdGVJbmRleF1cbiAgICAgICAgcmVtb3Zlcy5wdXNoKHJlbW92ZShzaW11bGF0ZSwgc2ltdWxhdGVJbmRleCwgc2ltdWxhdGVJdGVtICYmIHNpbXVsYXRlSXRlbS5rZXkpKVxuICAgIH1cblxuICAgIC8vIElmIHRoZSBvbmx5IG1vdmVzIHdlIGhhdmUgYXJlIGRlbGV0ZXMgdGhlbiB3ZSBjYW4ganVzdFxuICAgIC8vIGxldCB0aGUgZGVsZXRlIHBhdGNoIHJlbW92ZSB0aGVzZSBpdGVtcy5cbiAgICBpZiAocmVtb3Zlcy5sZW5ndGggPT09IGRlbGV0ZWRJdGVtcyAmJiAhaW5zZXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoaWxkcmVuOiBuZXdDaGlsZHJlbixcbiAgICAgICAgICAgIG1vdmVzOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBjaGlsZHJlbjogbmV3Q2hpbGRyZW4sXG4gICAgICAgIG1vdmVzOiB7XG4gICAgICAgICAgICByZW1vdmVzOiByZW1vdmVzLFxuICAgICAgICAgICAgaW5zZXJ0czogaW5zZXJ0c1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmUoYXJyLCBpbmRleCwga2V5KSB7XG4gICAgYXJyLnNwbGljZShpbmRleCwgMSlcblxuICAgIHJldHVybiB7XG4gICAgICAgIGZyb206IGluZGV4LFxuICAgICAgICBrZXk6IGtleVxuICAgIH1cbn1cblxuZnVuY3Rpb24ga2V5SW5kZXgoY2hpbGRyZW4pIHtcbiAgICB2YXIga2V5cyA9IHt9XG4gICAgdmFyIGZyZWUgPSBbXVxuICAgIHZhciBsZW5ndGggPSBjaGlsZHJlbi5sZW5ndGhcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cblxuICAgICAgICBpZiAoY2hpbGQua2V5KSB7XG4gICAgICAgICAgICBrZXlzW2NoaWxkLmtleV0gPSBpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcmVlLnB1c2goaSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGtleXM6IGtleXMsICAgICAvLyBBIGhhc2ggb2Yga2V5IG5hbWUgdG8gaW5kZXhcbiAgICAgICAgZnJlZTogZnJlZSAgICAgIC8vIEFuIGFycmF5IG9mIHVua2V5ZWQgaXRlbSBpbmRpY2VzXG4gICAgfVxufVxuXG5mdW5jdGlvbiBhcHBlbmRQYXRjaChhcHBseSwgcGF0Y2gpIHtcbiAgICBpZiAoYXBwbHkpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkoYXBwbHkpKSB7XG4gICAgICAgICAgICBhcHBseS5wdXNoKHBhdGNoKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXBwbHkgPSBbYXBwbHksIHBhdGNoXVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGFwcGx5XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHBhdGNoXG4gICAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob2JqLCBwcm9wKSB7XG4gIGNvbnNvbGUubG9nKFwicGxhc3RpcS5iaW5kKCkgd2lsbCBiZSBkZXByZWNhdGVkIGluIHRoZSBuZXh0IHJlbGVhc2UsIHVzZSBbbW9kZWwsICdmaWVsZE5hbWUnXSBpbnN0ZWFkXCIpO1xuXG4gIHJldHVybiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gb2JqW3Byb3BdO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgIG9ialtwcm9wXSA9IHZhbHVlO1xuICAgIH1cbiAgfTtcbn07XG4iLCJ2YXIgaCA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL2gnKTtcbnZhciBkb21Db21wb25lbnQgPSByZXF1aXJlKCcuL2RvbUNvbXBvbmVudCcpO1xudmFyIHNpbXBsZVByb21pc2UgPSByZXF1aXJlKCcuL3NpbXBsZVByb21pc2UnKTtcbnZhciBiaW5kaW5nTWV0YSA9IHJlcXVpcmUoJy4vbWV0YScpO1xudmFyIGNvZXJjZVRvVmRvbSA9IHJlcXVpcmUoJy4vY29lcmNlVG9WZG9tJyk7XG5cbmZ1bmN0aW9uIGRvVGhlbkZpcmVBZnRlclJlbmRlcihhdHRhY2htZW50LCBmbikge1xuICB0cnkge1xuICAgIGV4cG9ydHMuaHRtbC5jdXJyZW50UmVuZGVyID0ge2F0dGFjaG1lbnQ6IGF0dGFjaG1lbnR9O1xuICAgIGV4cG9ydHMuaHRtbC5jdXJyZW50UmVuZGVyLmZpbmlzaGVkID0gc2ltcGxlUHJvbWlzZSgpO1xuICAgIGV4cG9ydHMuaHRtbC5yZWZyZXNoID0gZnVuY3Rpb24gKGNvbXBvbmVudCkge1xuICAgICAgaWYgKGV4cG9ydHMuaHRtbC5jdXJyZW50UmVuZGVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRvbid0IGNhbGwgcmVmcmVzaC5odG1sLnJlZnJlc2ggZHVyaW5nIGEgcmVuZGVyIGN5Y2xlLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2ZlYXR1cmlzdC9wbGFzdGlxI3JlZnJlc2gtb3V0c2lkZS1yZW5kZXItY3ljbGVcIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0NvbXBvbmVudChjb21wb25lbnQpKSB7XG4gICAgICAgIHJlZnJlc2hDb21wb25lbnQoY29tcG9uZW50LCBhdHRhY2htZW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF0dGFjaG1lbnQucmVmcmVzaCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZuKCk7XG4gIH0gZmluYWxseSB7XG4gICAgZXhwb3J0cy5odG1sLmN1cnJlbnRSZW5kZXIuZmluaXNoZWQuZnVsZmlsbCgpO1xuICAgIGV4cG9ydHMuaHRtbC5jdXJyZW50UmVuZGVyLmZpbmlzaGVkID0gdW5kZWZpbmVkO1xuICAgIGRlbGV0ZSBleHBvcnRzLmh0bWwuY3VycmVudFJlbmRlcjtcbiAgICBleHBvcnRzLmh0bWwucmVmcmVzaCA9IHJlZnJlc2hPdXRPZlJlbmRlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWZyZXNoT3V0T2ZSZW5kZXIoKSB7XG4gIHRocm93IG5ldyBFcnJvcignUGxlYXNlIGFzc2lnbiBwbGFzdGlxLmh0bWwucmVmcmVzaCBkdXJpbmcgYSByZW5kZXIgY3ljbGUgaWYgeW91IHdhbnQgdG8gdXNlIGl0IGluIGV2ZW50IGhhbmRsZXJzLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2ZlYXR1cmlzdC9wbGFzdGlxI3JlZnJlc2gtb3V0c2lkZS1yZW5kZXItY3ljbGUnKTtcbn1cblxuZnVuY3Rpb24gaXNDb21wb25lbnQoY29tcG9uZW50KSB7XG4gIHJldHVybiBjb21wb25lbnRcbiAgICAmJiB0eXBlb2YgY29tcG9uZW50LmluaXQgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgY29tcG9uZW50LnVwZGF0ZSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBjb21wb25lbnQuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZXhwb3J0cy5hcHBlbmQgPSBmdW5jdGlvbiAoZWxlbWVudCwgcmVuZGVyLCBtb2RlbCwgb3B0aW9ucykge1xuICByZXR1cm4gc3RhcnRBdHRhY2htZW50KHJlbmRlciwgbW9kZWwsIG9wdGlvbnMsIGZ1bmN0aW9uKGNyZWF0ZWRFbGVtZW50KSB7XG4gICAgZWxlbWVudC5hcHBlbmRDaGlsZChjcmVhdGVkRWxlbWVudCk7XG4gIH0pO1xufTtcblxuZXhwb3J0cy5yZXBsYWNlID0gZnVuY3Rpb24gKGVsZW1lbnQsIHJlbmRlciwgbW9kZWwsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIHN0YXJ0QXR0YWNobWVudChyZW5kZXIsIG1vZGVsLCBvcHRpb25zLCBmdW5jdGlvbihjcmVhdGVkRWxlbWVudCkge1xuICAgIHZhciBwYXJlbnQgPSBlbGVtZW50LnBhcmVudE5vZGU7XG4gICAgZWxlbWVudC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChjcmVhdGVkRWxlbWVudCwgZWxlbWVudCk7XG4gIH0pO1xufTtcblxudmFyIGF0dGFjaG1lbnRJZCA9IDE7XG5cbmZ1bmN0aW9uIHN0YXJ0QXR0YWNobWVudChyZW5kZXIsIG1vZGVsLCBvcHRpb25zLCBhdHRhY2hUb0RvbSkge1xuICBpZiAodHlwZW9mIHJlbmRlciA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgcmVuZGVyLnJlbmRlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHN0YXJ0KGZ1bmN0aW9uICgpIHsgcmV0dXJuIHJlbmRlci5yZW5kZXIoKTsgfSwgbW9kZWwsIGF0dGFjaFRvRG9tKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RhcnQoZnVuY3Rpb24gKCkgeyByZXR1cm4gcmVuZGVyKG1vZGVsKTsgfSwgb3B0aW9ucywgYXR0YWNoVG9Eb20pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0YXJ0KHJlbmRlciwgb3B0aW9ucywgYXR0YWNoVG9Eb20pIHtcbiAgdmFyIHdpbiA9IChvcHRpb25zICYmIG9wdGlvbnMud2luZG93KSB8fCB3aW5kb3c7XG4gIHZhciByZXF1ZXN0UmVuZGVyID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5yZXF1ZXN0UmVuZGVyKSB8fCB3aW4ucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IHdpbi5zZXRUaW1lb3V0O1xuICB2YXIgcmVxdWVzdGVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gcmVmcmVzaCgpIHtcbiAgICBpZiAoIXJlcXVlc3RlZCkge1xuICAgICAgcmVxdWVzdFJlbmRlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlcXVlc3RlZCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChhdHRhY2htZW50LmF0dGFjaGVkKSB7XG4gICAgICAgICAgZG9UaGVuRmlyZUFmdGVyUmVuZGVyKGF0dGFjaG1lbnQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB2ZG9tID0gcmVuZGVyKCk7XG4gICAgICAgICAgICBjb21wb25lbnQudXBkYXRlKHZkb20pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJlcXVlc3RlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgdmFyIGF0dGFjaG1lbnQgPSB7XG4gICAgcmVmcmVzaDogcmVmcmVzaCxcbiAgICByZXF1ZXN0UmVuZGVyOiByZXF1ZXN0UmVuZGVyLFxuICAgIGlkOiBhdHRhY2htZW50SWQrKyxcbiAgICBhdHRhY2hlZDogdHJ1ZVxuICB9XG5cbiAgdmFyIGNvbXBvbmVudCA9IGRvbUNvbXBvbmVudCgpO1xuXG4gIGRvVGhlbkZpcmVBZnRlclJlbmRlcihhdHRhY2htZW50LCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHZkb20gPSByZW5kZXIoKTtcbiAgICBhdHRhY2hUb0RvbShjb21wb25lbnQuY3JlYXRlKHZkb20pKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBkZXRhY2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGF0dGFjaG1lbnQuYXR0YWNoZWQgPSBmYWxzZTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24gKCkge1xuICAgICAgY29tcG9uZW50LmRlc3Ryb3koe3JlbW92ZUVsZW1lbnQ6IHRydWV9KTtcbiAgICAgIGF0dGFjaG1lbnQuYXR0YWNoZWQgPSBmYWxzZTtcbiAgICB9XG4gIH07XG59O1xuXG5leHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc29sZS53YXJuKCdwbGFzdGlxLmF0dGFjaCBoYXMgYmVlbiByZW5hbWVkIHRvIHBsYXN0aXEuYXBwZW5kLCBwbGFzdGlxLmF0dGFjaCB3aWxsIGJlIGRlcHJlY2F0ZWQgaW4gYSBmdXR1cmUgdmVyc2lvbicpO1xuICByZXR1cm4gZXhwb3J0cy5hcHBlbmQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuZnVuY3Rpb24gcmVmcmVzaENvbXBvbmVudChjb21wb25lbnQsIGF0dGFjaG1lbnQpIHtcbiAgaWYgKCFjb21wb25lbnQuY2FuUmVmcmVzaCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcInRoaXMgY29tcG9uZW50IGNhbm5vdCBiZSByZWZyZXNoZWQsIG1ha2Ugc3VyZSB0aGF0IHRoZSBjb21wb25lbnQncyB2aWV3IGlzIHJldHVybmVkIGZyb20gYSBmdW5jdGlvblwiKTtcbiAgfVxuXG4gIGlmICghY29tcG9uZW50LnJlcXVlc3RlZCkge1xuICAgIHZhciByZXF1ZXN0UmVuZGVyID0gYXR0YWNobWVudC5yZXF1ZXN0UmVuZGVyO1xuXG4gICAgcmVxdWVzdFJlbmRlcihmdW5jdGlvbiAoKSB7XG4gICAgICBkb1RoZW5GaXJlQWZ0ZXJSZW5kZXIoYXR0YWNobWVudCwgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb21wb25lbnQucmVxdWVzdGVkID0gZmFsc2U7XG4gICAgICAgIGNvbXBvbmVudC5yZWZyZXNoKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBjb21wb25lbnQucmVxdWVzdGVkID0gdHJ1ZTtcbiAgfVxufVxuXG52YXIgbm9yZWZyZXNoID0ge307XG5cbmZ1bmN0aW9uIHJlZnJlc2hpZnkoZm4sIG9wdGlvbnMpIHtcbiAgaWYgKCFmbikge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIGlmICghZXhwb3J0cy5odG1sLmN1cnJlbnRSZW5kZXIpIHtcbiAgICBpZiAodHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBmbjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgY2Fubm90IGNyZWF0ZSB2aXJ0dWFsLWRvbSBldmVudCBoYW5kbGVycyBvdXRzaWRlIGEgcmVuZGVyIGZ1bmN0aW9uLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2ZlYXR1cmlzdC9wbGFzdGlxI291dHNpZGUtcmVuZGVyLWN5Y2xlJyk7XG4gICAgfVxuICB9XG5cbiAgdmFyIG9ubHlSZWZyZXNoQWZ0ZXJQcm9taXNlID0gb3B0aW9ucyAmJiBvcHRpb25zLnJlZnJlc2ggPT0gJ3Byb21pc2UnO1xuICB2YXIgY29tcG9uZW50VG9SZWZyZXNoID0gb3B0aW9ucyAmJiBvcHRpb25zLmNvbXBvbmVudDtcblxuICBpZiAob3B0aW9ucyAmJiAob3B0aW9ucy5ub3JlZnJlc2ggPT0gdHJ1ZSB8fCBvcHRpb25zLnJlZnJlc2ggPT0gZmFsc2UpKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIGF0dGFjaG1lbnQgPSBleHBvcnRzLmh0bWwuY3VycmVudFJlbmRlci5hdHRhY2htZW50O1xuICB2YXIgciA9IGF0dGFjaG1lbnQucmVmcmVzaDtcblxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXN1bHQgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgZnVuY3Rpb24gaGFuZGxlUmVzdWx0KHJlc3VsdCwgcHJvbWlzZVJlc3VsdCkge1xuICAgICAgdmFyIGFsbG93UmVmcmVzaCA9ICFvbmx5UmVmcmVzaEFmdGVyUHJvbWlzZSB8fCBwcm9taXNlUmVzdWx0O1xuXG4gICAgICBpZiAoYWxsb3dSZWZyZXNoICYmIHJlc3VsdCAmJiB0eXBlb2YocmVzdWx0KSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignYW5pbWF0aW9ucyBhcmUgbm93IGRlcHJlY2F0ZWQsIHlvdSBzaG91bGQgY29uc2lkZXIgdXNpbmcgcGxhc3RpcS5odG1sLnJlZnJlc2gnKTtcbiAgICAgICAgcmVzdWx0KHIpO1xuICAgICAgfSBlbHNlIGlmIChyZXN1bHQgJiYgdHlwZW9mKHJlc3VsdC50aGVuKSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGlmIChhbGxvd1JlZnJlc2gpIHtcbiAgICAgICAgICByKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkgeyBoYW5kbGVSZXN1bHQocmVzdWx0LCBvbmx5UmVmcmVzaEFmdGVyUHJvbWlzZSk7IH0pO1xuICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICByZXN1bHRcbiAgICAgICAgICAmJiB0eXBlb2YgcmVzdWx0LmluaXQgPT09ICdmdW5jdGlvbidcbiAgICAgICAgICAmJiB0eXBlb2YgcmVzdWx0LnVwZGF0ZSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICYmIHR5cGVvZiByZXN1bHQuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZWZyZXNoQ29tcG9uZW50KHJlc3VsdCwgYXR0YWNobWVudCk7XG4gICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChyZXN1bHQpID09PSAnW29iamVjdCBBcnJheV0nXG4gICAgICAgICAgJiYgcmVzdWx0Lmxlbmd0aCA+IDBcbiAgICAgICAgICAmJiB0eXBlb2YgcmVzdWx0WzBdLmluaXQgPT09ICdmdW5jdGlvbidcbiAgICAgICAgICAmJiB0eXBlb2YgcmVzdWx0WzBdLnVwZGF0ZSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICYmIHR5cGVvZiByZXN1bHRbMF0uZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc3VsdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmKHR5cGVvZiByZXN1bHRbaV0uaW5pdCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgICAmJiB0eXBlb2YgcmVzdWx0W2ldLnVwZGF0ZSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICAgICAgICAmJiB0eXBlb2YgcmVzdWx0W2ldLmRlc3Ryb3kgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJlZnJlc2hDb21wb25lbnQocmVzdWx0W2ldLCBhdHRhY2htZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50VG9SZWZyZXNoKSB7XG4gICAgICAgIHJlZnJlc2hDb21wb25lbnQoY29tcG9uZW50VG9SZWZyZXNoLCBhdHRhY2htZW50KTtcbiAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09PSBub3JlZnJlc2gpIHtcbiAgICAgICAgLy8gZG9uJ3QgcmVmcmVzaDtcbiAgICAgIH0gZWxzZSBpZiAoYWxsb3dSZWZyZXNoKSB7XG4gICAgICAgIHIoKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaGFuZGxlUmVzdWx0KHJlc3VsdCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGJpbmRUZXh0SW5wdXQoYXR0cmlidXRlcywgY2hpbGRyZW4sIGdldCwgc2V0KSB7XG4gIHZhciB0ZXh0RXZlbnROYW1lcyA9IFsnb25rZXlkb3duJywgJ29uaW5wdXQnLCAnb25wYXN0ZScsICd0ZXh0SW5wdXQnXTtcblxuICB2YXIgYmluZGluZ1ZhbHVlID0gZ2V0KCk7XG4gIGlmICghKGJpbmRpbmdWYWx1ZSBpbnN0YW5jZW9mIEVycm9yKSkge1xuICAgIGF0dHJpYnV0ZXMudmFsdWUgPSBiaW5kaW5nVmFsdWUgIT0gdW5kZWZpbmVkPyBiaW5kaW5nVmFsdWU6ICcnO1xuICB9XG5cbiAgYXR0YWNoRXZlbnRIYW5kbGVyKGF0dHJpYnV0ZXMsIHRleHRFdmVudE5hbWVzLCBmdW5jdGlvbiAoZXYpIHtcbiAgICBpZiAoYmluZGluZ1ZhbHVlICE9IGV2LnRhcmdldC52YWx1ZSkge1xuICAgICAgc2V0KGV2LnRhcmdldC52YWx1ZSk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gc2VxdWVuY2VGdW5jdGlvbnMoaGFuZGxlcjEsIGhhbmRsZXIyKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoZXYpIHtcbiAgICBoYW5kbGVyMShldik7XG4gICAgcmV0dXJuIGhhbmRsZXIyKGV2KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gaW5zZXJ0RXZlbnRIYW5kbGVyKGF0dHJpYnV0ZXMsIGV2ZW50TmFtZSwgaGFuZGxlciwgYWZ0ZXIpIHtcbiAgdmFyIHByZXZpb3VzSGFuZGxlciA9IGF0dHJpYnV0ZXNbZXZlbnROYW1lXTtcbiAgaWYgKHByZXZpb3VzSGFuZGxlcikge1xuICAgIGlmIChhZnRlcikge1xuICAgICAgYXR0cmlidXRlc1tldmVudE5hbWVdID0gc2VxdWVuY2VGdW5jdGlvbnMocHJldmlvdXNIYW5kbGVyLCBoYW5kbGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXR0cmlidXRlc1tldmVudE5hbWVdID0gc2VxdWVuY2VGdW5jdGlvbnMoaGFuZGxlciwgcHJldmlvdXNIYW5kbGVyKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgYXR0cmlidXRlc1tldmVudE5hbWVdID0gaGFuZGxlcjtcbiAgfVxufVxuXG5mdW5jdGlvbiBhdHRhY2hFdmVudEhhbmRsZXIoYXR0cmlidXRlcywgZXZlbnROYW1lcywgaGFuZGxlcikge1xuICBpZiAoZXZlbnROYW1lcyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgZm9yICh2YXIgbiA9IDA7IG4gPCBldmVudE5hbWVzLmxlbmd0aDsgbisrKSB7XG4gICAgICBpbnNlcnRFdmVudEhhbmRsZXIoYXR0cmlidXRlcywgZXZlbnROYW1lc1tuXSwgaGFuZGxlcik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGluc2VydEV2ZW50SGFuZGxlcihhdHRyaWJ1dGVzLCBldmVudE5hbWVzLCBoYW5kbGVyKTtcbiAgfVxufVxuXG52YXIgaW5wdXRUeXBlQmluZGluZ3MgPSB7XG4gIHRleHQ6IGJpbmRUZXh0SW5wdXQsXG5cbiAgdGV4dGFyZWE6IGJpbmRUZXh0SW5wdXQsXG5cbiAgY2hlY2tib3g6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzLCBjaGlsZHJlbiwgZ2V0LCBzZXQpIHtcbiAgICBhdHRyaWJ1dGVzLmNoZWNrZWQgPSBnZXQoKTtcblxuICAgIGF0dGFjaEV2ZW50SGFuZGxlcihhdHRyaWJ1dGVzLCAnb25jbGljaycsIGZ1bmN0aW9uIChldikge1xuICAgICAgYXR0cmlidXRlcy5jaGVja2VkID0gZXYudGFyZ2V0LmNoZWNrZWQ7XG4gICAgICBzZXQoZXYudGFyZ2V0LmNoZWNrZWQpO1xuICAgIH0pO1xuICB9LFxuXG4gIHJhZGlvOiBmdW5jdGlvbiAoYXR0cmlidXRlcywgY2hpbGRyZW4sIGdldCwgc2V0KSB7XG4gICAgdmFyIHZhbHVlID0gYXR0cmlidXRlcy52YWx1ZTtcbiAgICBhdHRyaWJ1dGVzLmNoZWNrZWQgPSBnZXQoKSA9PSBhdHRyaWJ1dGVzLnZhbHVlO1xuXG4gICAgYXR0YWNoRXZlbnRIYW5kbGVyKGF0dHJpYnV0ZXMsICdvbmNsaWNrJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICBhdHRyaWJ1dGVzLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgc2V0KHZhbHVlKTtcbiAgICB9KTtcbiAgfSxcblxuICBzZWxlY3Q6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzLCBjaGlsZHJlbiwgZ2V0LCBzZXQpIHtcbiAgICB2YXIgY3VycmVudFZhbHVlID0gZ2V0KCk7XG5cbiAgICB2YXIgb3B0aW9ucyA9IGNoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ29wdGlvbic7XG4gICAgfSk7XG5cbiAgICB2YXIgc2VsZWN0ZWRPcHRpb24gPSBvcHRpb25zLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgIHJldHVybiBjaGlsZC5wcm9wZXJ0aWVzLnZhbHVlID09IGN1cnJlbnRWYWx1ZTtcbiAgICB9KVswXTtcblxuICAgIHZhciB2YWx1ZXMgPSBvcHRpb25zLm1hcChmdW5jdGlvbiAob3B0aW9uKSB7XG4gICAgICByZXR1cm4gb3B0aW9uLnByb3BlcnRpZXMudmFsdWU7XG4gICAgfSk7XG5cbiAgICBmb3IodmFyIG4gPSAwOyBuIDwgb3B0aW9ucy5sZW5ndGg7IG4rKykge1xuICAgICAgdmFyIG9wdGlvbiA9IG9wdGlvbnNbbl07XG4gICAgICBvcHRpb24ucHJvcGVydGllcy5zZWxlY3RlZCA9IG9wdGlvbiA9PSBzZWxlY3RlZE9wdGlvbjtcbiAgICAgIG9wdGlvbi5wcm9wZXJ0aWVzLnZhbHVlID0gbjtcbiAgICB9XG5cbiAgICBhdHRhY2hFdmVudEhhbmRsZXIoYXR0cmlidXRlcywgJ29uY2hhbmdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICBzZXQodmFsdWVzW2V2LnRhcmdldC52YWx1ZV0pO1xuICAgIH0pO1xuICB9LFxuXG4gIGZpbGU6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzLCBjaGlsZHJlbiwgZ2V0LCBzZXQpIHtcbiAgICB2YXIgbXVsdGlwbGUgPSBhdHRyaWJ1dGVzLm11bHRpcGxlO1xuXG4gICAgYXR0YWNoRXZlbnRIYW5kbGVyKGF0dHJpYnV0ZXMsICdvbmNoYW5nZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgaWYgKG11bHRpcGxlKSB7XG4gICAgICAgIHNldChldi50YXJnZXQuZmlsZXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0KGV2LnRhcmdldC5maWxlc1swXSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGJpbmRNb2RlbChhdHRyaWJ1dGVzLCBjaGlsZHJlbiwgdHlwZSkge1xuICB2YXIgYmluZCA9IGlucHV0VHlwZUJpbmRpbmdzW3R5cGVdIHx8IGJpbmRUZXh0SW5wdXQ7XG5cbiAgdmFyIGJpbmRpbmdBdHRyID0gbWFrZUJpbmRpbmcoYXR0cmlidXRlcy5iaW5kaW5nKTtcbiAgYmluZChhdHRyaWJ1dGVzLCBjaGlsZHJlbiwgYmluZGluZ0F0dHIuZ2V0LCBiaW5kaW5nQXR0ci5zZXQpO1xufVxuXG5mdW5jdGlvbiBpbnB1dFR5cGUoc2VsZWN0b3IsIGF0dHJpYnV0ZXMpIHtcbiAgaWYgKC9edGV4dGFyZWFcXGIvaS50ZXN0KHNlbGVjdG9yKSkge1xuICAgIHJldHVybiAndGV4dGFyZWEnO1xuICB9IGVsc2UgaWYgKC9ec2VsZWN0XFxiL2kudGVzdChzZWxlY3RvcikpIHtcbiAgICByZXR1cm4gJ3NlbGVjdCc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGF0dHJpYnV0ZXMudHlwZSB8fCAndGV4dCc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZmxhdHRlbihzdGFydEluZGV4LCBhcnJheSkge1xuICB2YXIgZmxhdEFycmF5ID0gW107XG5cbiAgZnVuY3Rpb24gYXBwZW5kKHN0YXJ0SW5kZXgsIGFycmF5KSB7XG4gICAgZm9yKHZhciBuID0gc3RhcnRJbmRleDsgbiA8IGFycmF5Lmxlbmd0aDsgbisrKSB7XG4gICAgICB2YXIgaXRlbSA9IGFycmF5W25dO1xuICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBhcHBlbmQoMCwgaXRlbSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbGF0QXJyYXkucHVzaChpdGVtKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBhcHBlbmQoc3RhcnRJbmRleCwgYXJyYXkpO1xuXG4gIHJldHVybiBmbGF0QXJyYXk7XG59XG5cbmZ1bmN0aW9uIGNvZXJjZUNoaWxkcmVuKGNoaWxkcmVuKSB7XG4gIHJldHVybiBjaGlsZHJlbi5tYXAoY29lcmNlVG9WZG9tKTtcbn1cblxudmFyIHJlbmFtZXMgPSB7XG4gIGZvcjogJ2h0bWxGb3InLFxuICBjbGFzczogJ2NsYXNzTmFtZScsXG4gIGNvbnRlbnRlZGl0YWJsZTogJ2NvbnRlbnRFZGl0YWJsZScsXG4gIHRhYmluZGV4OiAndGFiSW5kZXgnLFxuICBjb2xzcGFuOiAnY29sU3Bhbidcbn07XG5cbnZhciBkYXRhQXR0cmlidXRlUmVnZXggPSAvXmRhdGEtLztcblxuZnVuY3Rpb24gcHJlcGFyZUF0dHJpYnV0ZXMoc2VsZWN0b3IsIGF0dHJpYnV0ZXMsIGNoaWxkRWxlbWVudHMpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhdHRyaWJ1dGVzKTtcbiAgdmFyIGRhdGFzZXQ7XG4gIHZhciBldmVudEhhbmRsZXJXcmFwcGVyID0gZXhwb3J0cy5odG1sLmN1cnJlbnRSZW5kZXIgJiYgZXhwb3J0cy5odG1sLmN1cnJlbnRSZW5kZXIuZXZlbnRIYW5kbGVyV3JhcHBlcjtcblxuICBmb3IgKHZhciBrID0gMDsgayA8IGtleXMubGVuZ3RoOyBrKyspIHtcbiAgICB2YXIga2V5ID0ga2V5c1trXTtcbiAgICB2YXIgYXR0cmlidXRlID0gYXR0cmlidXRlc1trZXldO1xuXG4gICAgaWYgKHR5cGVvZihhdHRyaWJ1dGUpID09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChldmVudEhhbmRsZXJXcmFwcGVyKSB7XG4gICAgICAgIGF0dHJpYnV0ZXNba2V5XSA9IHJlZnJlc2hpZnkoZXhwb3J0cy5odG1sLmN1cnJlbnRSZW5kZXIuZXZlbnRIYW5kbGVyV3JhcHBlci5jYWxsKHVuZGVmaW5lZCwga2V5LnJlcGxhY2UoL15vbi8sICcnKSwgYXR0cmlidXRlKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdHRyaWJ1dGVzW2tleV0gPSByZWZyZXNoaWZ5KGF0dHJpYnV0ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJlbmFtZSA9IHJlbmFtZXNba2V5XTtcbiAgICBpZiAocmVuYW1lKSB7XG4gICAgICBhdHRyaWJ1dGVzW3JlbmFtZV0gPSBhdHRyaWJ1dGU7XG4gICAgICBkZWxldGUgYXR0cmlidXRlc1trZXldO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGRhdGFBdHRyaWJ1dGVSZWdleC50ZXN0KGtleSkpIHtcbiAgICAgIGlmICghZGF0YXNldCkge1xuICAgICAgICBkYXRhc2V0ID0gYXR0cmlidXRlcy5kYXRhc2V0O1xuXG4gICAgICAgIGlmICghZGF0YXNldCkge1xuICAgICAgICAgIGRhdGFzZXQgPSBhdHRyaWJ1dGVzLmRhdGFzZXQgPSB7fTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgZGF0YWtleSA9IGtleS5yZXBsYWNlKGRhdGFBdHRyaWJ1dGVSZWdleCwgJycpO1xuICAgICAgZGF0YXNldFtkYXRha2V5XSA9IGF0dHJpYnV0ZTtcbiAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzW2tleV07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cblxuICBpZiAoYXR0cmlidXRlcy5jbGFzc05hbWUpIHtcbiAgICBhdHRyaWJ1dGVzLmNsYXNzTmFtZSA9IGdlbmVyYXRlQ2xhc3NOYW1lKGF0dHJpYnV0ZXMuY2xhc3NOYW1lKTtcbiAgfVxuXG4gIGlmIChhdHRyaWJ1dGVzLmJpbmRpbmcpIHtcbiAgICBiaW5kTW9kZWwoYXR0cmlidXRlcywgY2hpbGRFbGVtZW50cywgaW5wdXRUeXBlKHNlbGVjdG9yLCBhdHRyaWJ1dGVzKSk7XG4gICAgZGVsZXRlIGF0dHJpYnV0ZXMuYmluZGluZztcbiAgfVxufVxuXG4vKipcbiAqIHRoaXMgZnVuY3Rpb24gaXMgcXVpdGUgdWdseSBhbmQgeW91IG1heSBiZSB2ZXJ5IHRlbXB0ZWRcbiAqIHRvIHJlZmFjdG9yIGl0IGludG8gc21hbGxlciBmdW5jdGlvbnMsIEkgY2VydGFpbmx5IGFtLlxuICogaG93ZXZlciwgaXQgd2FzIHdyaXR0ZW4gbGlrZSB0aGlzIGZvciBwZXJmb3JtYW5jZVxuICogc28gdGhpbmsgb2YgdGhhdCBiZWZvcmUgcmVmYWN0b3JpbmchIDopXG4gKi9cbmV4cG9ydHMuaHRtbCA9IGZ1bmN0aW9uIChoaWVyYXJjaHlTZWxlY3Rvcikge1xuICB2YXIgaGFzSGllcmFyY2h5ID0gaGllcmFyY2h5U2VsZWN0b3IuaW5kZXhPZignICcpID49IDA7XG4gIHZhciBzZWxlY3Rvciwgc2VsZWN0b3JFbGVtZW50cztcblxuICBpZiAoaGFzSGllcmFyY2h5KSB7XG4gICAgc2VsZWN0b3JFbGVtZW50cyA9IGhpZXJhcmNoeVNlbGVjdG9yLm1hdGNoKC9cXFMrL2cpO1xuICAgIHNlbGVjdG9yID0gc2VsZWN0b3JFbGVtZW50c1tzZWxlY3RvckVsZW1lbnRzLmxlbmd0aCAtIDFdO1xuICB9IGVsc2Uge1xuICAgIHNlbGVjdG9yID0gaGllcmFyY2h5U2VsZWN0b3I7XG4gIH1cblxuICB2YXIgYXR0cmlidXRlcztcbiAgdmFyIGNoaWxkRWxlbWVudHM7XG4gIHZhciB2ZG9tO1xuXG4gIGlmIChhcmd1bWVudHNbMV0gJiYgYXJndW1lbnRzWzFdLmNvbnN0cnVjdG9yID09IE9iamVjdCkge1xuICAgIGF0dHJpYnV0ZXMgPSBhcmd1bWVudHNbMV07XG4gICAgY2hpbGRFbGVtZW50cyA9IGNvZXJjZUNoaWxkcmVuKGZsYXR0ZW4oMiwgYXJndW1lbnRzKSk7XG5cbiAgICBwcmVwYXJlQXR0cmlidXRlcyhzZWxlY3RvciwgYXR0cmlidXRlcywgY2hpbGRFbGVtZW50cyk7XG5cbiAgICB2ZG9tID0gaChzZWxlY3RvciwgYXR0cmlidXRlcywgY2hpbGRFbGVtZW50cyk7XG4gIH0gZWxzZSB7XG4gICAgY2hpbGRFbGVtZW50cyA9IGNvZXJjZUNoaWxkcmVuKGZsYXR0ZW4oMSwgYXJndW1lbnRzKSk7XG4gICAgdmRvbSA9IGgoc2VsZWN0b3IsIGNoaWxkRWxlbWVudHMpO1xuICB9XG5cbiAgaWYgKGhhc0hpZXJhcmNoeSkge1xuICAgIGZvcih2YXIgbiA9IHNlbGVjdG9yRWxlbWVudHMubGVuZ3RoIC0gMjsgbiA+PSAwOyBuLS0pIHtcbiAgICAgIHZkb20gPSBoKHNlbGVjdG9yRWxlbWVudHNbbl0sIHZkb20pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB2ZG9tO1xufTtcblxuZXhwb3J0cy5odG1sLnJlZnJlc2hpZnkgPSByZWZyZXNoaWZ5O1xuZXhwb3J0cy5odG1sLnJlZnJlc2ggPSByZWZyZXNoT3V0T2ZSZW5kZXI7XG5leHBvcnRzLmh0bWwubm9yZWZyZXNoID0gbm9yZWZyZXNoO1xuXG5mdW5jdGlvbiBtYWtlQmluZGluZyhiLCBvcHRpb25zKSB7XG4gIHZhciBiaW5kaW5nID0gYiBpbnN0YW5jZW9mIEFycmF5XG4gICAgPyAgYmluZGluZ09iamVjdC5hcHBseSh1bmRlZmluZWQsIGIpXG4gICAgOiBiO1xuXG4gIGJpbmRpbmcuc2V0ID0gcmVmcmVzaGlmeShiaW5kaW5nLnNldCwgb3B0aW9ucyk7XG5cbiAgcmV0dXJuIGJpbmRpbmc7XG59O1xuXG5mdW5jdGlvbiBtYWtlQ29udmVydGVyKGNvbnZlcnRlcikge1xuICBpZiAodHlwZW9mIGNvbnZlcnRlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZpZXc6IGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9LFxuICAgICAgbW9kZWw6IGZ1bmN0aW9uICh2aWV3KSB7XG4gICAgICAgIHJldHVybiBjb252ZXJ0ZXIodmlldyk7XG4gICAgICB9XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gY29udmVydGVyO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoYWluQ29udmVydGVycyhzdGFydEluZGV4LCBjb252ZXJ0ZXJzKSB7XG4gIGlmICgoY29udmVydGVycy5sZW5ndGggLSBzdGFydEluZGV4KSA9PSAxKSB7XG4gICAgcmV0dXJuIG1ha2VDb252ZXJ0ZXIoY29udmVydGVyc1tzdGFydEluZGV4XSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIF9jb252ZXJ0ZXJzO1xuICAgIGZ1bmN0aW9uIG1ha2VDb252ZXJ0ZXJzKCkge1xuICAgICAgaWYgKCFfY29udmVydGVycykge1xuICAgICAgICBfY29udmVydGVycyA9IG5ldyBBcnJheShjb252ZXJ0ZXJzLmxlbmd0aCAtIHN0YXJ0SW5kZXgpO1xuXG4gICAgICAgIGZvcih2YXIgbiA9IHN0YXJ0SW5kZXg7IG4gPCBjb252ZXJ0ZXJzLmxlbmd0aDsgbisrKSB7XG4gICAgICAgICAgX2NvbnZlcnRlcnNbbiAtIHN0YXJ0SW5kZXhdID0gbWFrZUNvbnZlcnRlcihjb252ZXJ0ZXJzW25dKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB2aWV3OiBmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgbWFrZUNvbnZlcnRlcnMoKTtcbiAgICAgICAgdmFyIGludGVybWVkaWF0ZVZhbHVlID0gbW9kZWw7XG4gICAgICAgIGZvcih2YXIgbiA9IDA7IG4gPCBfY29udmVydGVycy5sZW5ndGg7IG4rKykge1xuICAgICAgICAgIGludGVybWVkaWF0ZVZhbHVlID0gX2NvbnZlcnRlcnNbbl0udmlldyhpbnRlcm1lZGlhdGVWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGludGVybWVkaWF0ZVZhbHVlO1xuICAgICAgfSxcblxuICAgICAgbW9kZWw6IGZ1bmN0aW9uICh2aWV3KSB7XG4gICAgICAgIG1ha2VDb252ZXJ0ZXJzKCk7XG4gICAgICAgIHZhciBpbnRlcm1lZGlhdGVWYWx1ZSA9IHZpZXc7XG4gICAgICAgIGZvcih2YXIgbiA9IF9jb252ZXJ0ZXJzLmxlbmd0aCAtIDE7IG4gPj0gMDsgbi0tKSB7XG4gICAgICAgICAgaW50ZXJtZWRpYXRlVmFsdWUgPSBfY29udmVydGVyc1tuXS5tb2RlbChpbnRlcm1lZGlhdGVWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGludGVybWVkaWF0ZVZhbHVlO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gYmluZGluZ09iamVjdChtb2RlbCwgcHJvcGVydHksIG9wdGlvbnMpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XG4gICAgdmFyIGNvbnZlcnRlciA9IGNoYWluQ29udmVydGVycygyLCBhcmd1bWVudHMpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtZXRhID0gYmluZGluZ01ldGEobW9kZWwsIHByb3BlcnR5KTtcblxuICAgICAgICB2YXIgbW9kZWxWYWx1ZSA9IG1vZGVsW3Byb3BlcnR5XTtcbiAgICAgICAgaWYgKG1ldGEuZXJyb3IpIHtcbiAgICAgICAgICByZXR1cm4gbWV0YS52aWV3O1xuICAgICAgICB9IGVsc2UgaWYgKG1ldGEudmlldyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFyIG1vZGVsVGV4dCA9IGNvbnZlcnRlci52aWV3KG1vZGVsVmFsdWUpO1xuICAgICAgICAgIG1ldGEudmlldyA9IG1vZGVsVGV4dDtcbiAgICAgICAgICByZXR1cm4gbW9kZWxUZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBwcmV2aW91c1ZhbHVlID0gY29udmVydGVyLm1vZGVsKG1ldGEudmlldyk7XG4gICAgICAgICAgdmFyIG1vZGVsVGV4dCA9IGNvbnZlcnRlci52aWV3KG1vZGVsVmFsdWUpO1xuICAgICAgICAgIHZhciBub3JtYWxpc2VkUHJldmlvdXNUZXh0ID0gY29udmVydGVyLnZpZXcocHJldmlvdXNWYWx1ZSk7XG5cbiAgICAgICAgICBpZiAobW9kZWxUZXh0ID09PSBub3JtYWxpc2VkUHJldmlvdXNUZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gbWV0YS52aWV3O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtZXRhLnZpZXcgPSBtb2RlbFRleHQ7XG4gICAgICAgICAgICByZXR1cm4gbW9kZWxUZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgc2V0OiBmdW5jdGlvbih2aWV3KSB7XG4gICAgICAgIHZhciBtZXRhID0gYmluZGluZ01ldGEobW9kZWwsIHByb3BlcnR5KTtcbiAgICAgICAgbWV0YS52aWV3ID0gdmlldztcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIG1vZGVsW3Byb3BlcnR5XSA9IGNvbnZlcnRlci5tb2RlbCh2aWV3LCBtb2RlbFtwcm9wZXJ0eV0pO1xuICAgICAgICAgIGRlbGV0ZSBtZXRhLmVycm9yO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgbWV0YS5lcnJvciA9IGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsW3Byb3BlcnR5XTtcbiAgICAgIH0sXG5cbiAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIG1vZGVsW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn07XG5cbmV4cG9ydHMuYmluZGluZyA9IG1ha2VCaW5kaW5nO1xuZXhwb3J0cy5odG1sLmJpbmRpbmcgPSBtYWtlQmluZGluZztcbmV4cG9ydHMuaHRtbC5tZXRhID0gYmluZGluZ01ldGE7XG5cbmZ1bmN0aW9uIHJhd0h0bWwoKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDIpIHtcbiAgICB2YXIgc2VsZWN0b3IgPSBhcmd1bWVudHNbMF07XG4gICAgdmFyIGh0bWwgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIG9wdGlvbnMgPSB7aW5uZXJIVE1MOiBodG1sfTtcbiAgICByZXR1cm4gZXhwb3J0cy5odG1sKHNlbGVjdG9yLCBvcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2VsZWN0b3IgPSBhcmd1bWVudHNbMF07XG4gICAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIGh0bWwgPSBhcmd1bWVudHNbMl07XG4gICAgb3B0aW9ucy5pbm5lckhUTUwgPSBodG1sO1xuICAgIHJldHVybiBleHBvcnRzLmh0bWwoc2VsZWN0b3IsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydHMuaHRtbC5yYXdIdG1sID0gcmF3SHRtbDtcblxuZnVuY3Rpb24gZ2VuZXJhdGVDbGFzc05hbWUob2JqKSB7XG4gIGlmICh0eXBlb2Yob2JqKSA9PSAnb2JqZWN0Jykge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgcmV0dXJuIG9iai5qb2luKCcgJykgfHwgdW5kZWZpbmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgICB9KS5qb2luKCcgJykgfHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG59O1xuIiwiZnVuY3Rpb24gU2ltcGxlUHJvbWlzZSAoKSB7XG4gIHRoaXMubGlzdGVuZXJzID0gW107XG59XG5cblNpbXBsZVByb21pc2UucHJvdG90eXBlLmZ1bGZpbGwgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaWYgKCF0aGlzLmlzRnVsZmlsbGVkKSB7XG4gICAgdGhpcy5pc0Z1bGZpbGxlZCA9IHRydWU7XG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICAgIHRoaXMubGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24gKGxpc3RlbmVyKSB7XG4gICAgICBsaXN0ZW5lcigpO1xuICAgIH0pO1xuICB9XG59O1xuXG5TaW1wbGVQcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKHN1Y2Nlc3MpIHtcbiAgaWYgKHRoaXMuaXNGdWxmaWxsZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBzdWNjZXNzKHNlbGYudmFsdWUpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubGlzdGVuZXJzLnB1c2goc3VjY2Vzcyk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gbmV3IFNpbXBsZVByb21pc2UoKTtcbn07XG4iLCJ2YXIgZG9tQ29tcG9uZW50ID0gcmVxdWlyZSgnLi9kb21Db21wb25lbnQnKTtcbnZhciBWVGV4dCA9IHJlcXVpcmUoXCJ2aXJ0dWFsLWRvbS92bm9kZS92dGV4dC5qc1wiKVxuXG5mdW5jdGlvbiBXaW5kb3dXaWRnZXQoYXR0cmlidXRlcywgdmRvbSwgcmVmcmVzaEZ1bmN0aW9uKSB7XG4gIHRoaXMuYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXM7XG4gIHRoaXMudmRvbSA9IHZkb20gfHwgbmV3IFZUZXh0KCcnKTtcbiAgdGhpcy5jb21wb25lbnQgPSBkb21Db21wb25lbnQoKTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuY2FjaGUgPSB7fTtcbiAgT2JqZWN0LmtleXModGhpcy5hdHRyaWJ1dGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBzZWxmLmNhY2hlW2tleV0gPSByZWZyZXNoRnVuY3Rpb24oc2VsZi5hdHRyaWJ1dGVzW2tleV0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYXBwbHlBdHRyaWJ1dGUoYXR0cmlidXRlcywgbmFtZSwgZWxlbWVudCkge1xuICBpZiAoL15vbi8udGVzdChuYW1lKSkge1xuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLnN1YnN0cigyKSwgdGhpc1tuYW1lXSk7XG4gIH1cbn1cblxuV2luZG93V2lkZ2V0LnByb3RvdHlwZS50eXBlID0gJ1dpZGdldCc7XG5cbldpbmRvd1dpZGdldC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgYXBwbHlQcm9wZXJ0eURpZmZzKHdpbmRvdywge30sIHRoaXMuYXR0cmlidXRlcywge30sIHRoaXMuY2FjaGUpO1xuICByZXR1cm4gdGhpcy5jb21wb25lbnQuY3JlYXRlKHRoaXMudmRvbSk7XG59O1xuXG5mdW5jdGlvbiB1bmlxKGFycmF5KSB7XG4gIHZhciBzb3J0ZWRBcnJheSA9IGFycmF5LnNsaWNlKCk7XG4gIHNvcnRlZEFycmF5LnNvcnQoKTtcblxuICB2YXIgbGFzdDtcblxuICBmb3IodmFyIG4gPSAwOyBuIDwgc29ydGVkQXJyYXkubGVuZ3RoOykge1xuICAgIHZhciBjdXJyZW50ID0gc29ydGVkQXJyYXlbbl07XG5cbiAgICBpZiAobGFzdCA9PT0gY3VycmVudCkge1xuICAgICAgc29ydGVkQXJyYXkuc3BsaWNlKG4sIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuKys7XG4gICAgfVxuICAgIGxhc3QgPSBjdXJyZW50O1xuICB9XG5cbiAgcmV0dXJuIHNvcnRlZEFycmF5O1xufVxuXG5mdW5jdGlvbiBhcHBseVByb3BlcnR5RGlmZnMoZWxlbWVudCwgcHJldmlvdXMsIGN1cnJlbnQsIHByZXZpb3VzQ2FjaGUsIGN1cnJlbnRDYWNoZSkge1xuICB1bmlxKE9iamVjdC5rZXlzKHByZXZpb3VzKS5jb25jYXQoT2JqZWN0LmtleXMoY3VycmVudCkpKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAoL15vbi8udGVzdChrZXkpKSB7XG4gICAgICB2YXIgZXZlbnQgPSBrZXkuc2xpY2UoMik7XG5cbiAgICAgIHZhciBwcmV2ID0gcHJldmlvdXNba2V5XTtcbiAgICAgIHZhciBjdXJyID0gY3VycmVudFtrZXldO1xuICAgICAgdmFyIHJlZnJlc2hQcmV2ID0gcHJldmlvdXNDYWNoZVtrZXldO1xuICAgICAgdmFyIHJlZnJlc2hDdXJyID0gY3VycmVudENhY2hlW2tleV07XG5cbiAgICAgIGlmIChwcmV2ICE9PSB1bmRlZmluZWQgJiYgY3VyciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgcmVmcmVzaFByZXYpO1xuICAgICAgfSBlbHNlIGlmIChwcmV2ICE9PSB1bmRlZmluZWQgJiYgY3VyciAhPT0gdW5kZWZpbmVkICYmIHByZXYgIT09IGN1cnIpIHtcbiAgICAgICAgZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCByZWZyZXNoUHJldik7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgcmVmcmVzaEN1cnIpO1xuICAgICAgfSBlbHNlIGlmIChwcmV2ID09PSB1bmRlZmluZWQgJiYgY3VyciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgcmVmcmVzaEN1cnIpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbldpbmRvd1dpZGdldC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHByZXZpb3VzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgYXBwbHlQcm9wZXJ0eURpZmZzKHdpbmRvdywgcHJldmlvdXMuYXR0cmlidXRlcywgdGhpcy5hdHRyaWJ1dGVzLCBwcmV2aW91cy5jYWNoZSwgdGhpcy5jYWNoZSk7XG4gIHRoaXMuY29tcG9uZW50ID0gcHJldmlvdXMuY29tcG9uZW50O1xuICByZXR1cm4gdGhpcy5jb21wb25lbnQudXBkYXRlKHRoaXMudmRvbSk7XG59O1xuXG5XaW5kb3dXaWRnZXQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gIGFwcGx5UHJvcGVydHlEaWZmcyh3aW5kb3csIHRoaXMuYXR0cmlidXRlcywge30sIHRoaXMuY2FjaGUsIHt9KTtcbiAgdGhpcy5jb21wb25lbnQuZGVzdHJveSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXR0cmlidXRlcywgdmRvbSwgcmVmcmVzaEZ1bmN0aW9uKSB7XG4gIHJldHVybiBuZXcgV2luZG93V2lkZ2V0KGF0dHJpYnV0ZXMsIHZkb20sIHJlZnJlc2hGdW5jdGlvbik7XG59O1xuIixudWxsXX0=
