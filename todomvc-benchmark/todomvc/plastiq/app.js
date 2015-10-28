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
