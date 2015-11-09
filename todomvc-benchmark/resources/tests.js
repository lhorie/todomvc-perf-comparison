var numberOfItemsToAdd = 50;
var Suites = [];

Suites.push({
    name: 'Mithril',
    url: 'todomvc/mithril/index.html',
    version: '0.1.21',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var inputEvent = document.createEvent('Event');
                inputEvent.initEvent('input', true, true);
                newTodo.value = 'Mithril ------- Something to do ' + i;
                newTodo.dispatchEvent(inputEvent);

                var keydownEvent = document.createEvent('Event');
                keydownEvent.initEvent('keypress', true, true);
                keydownEvent.keyCode = 13; // VK_ENTER
                newTodo.dispatchEvent(keydownEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Vue',
    url: 'todomvc/vue/index.html',
    version: '0.10.0',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            var app = contentWindow.app;
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var keyupEvent = document.createEvent('Event');
                keyupEvent.initEvent('keyup', true, true);
                keyupEvent.keyCode = 13;
                app.newTodo = 'Vue ----------- Something to do ' + i;
                newTodo.dispatchEvent(keyupEvent)
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Backbone',
    url: 'todomvc/backbone/index.html',
    version: '1.1.2',
    prepare: function (runner, contentWindow, contentDocument) {
    contentWindow.Backbone.sync = function () {}
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            var appView = contentWindow.appView;
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var keypressEvent = document.createEvent('Event');
                keypressEvent.initEvent('keypress', true, true);
                keypressEvent.which = 13;
                newTodo.value = 'Backbone ------ Something to do ' + i;
                newTodo.dispatchEvent(keypressEvent)
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Knockout',
    url: 'todomvc/knockoutjs/index.html',
    version: '3.1.0',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            var viewModel = contentWindow.viewModel;
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var keyupEvent = document.createEvent('Event');
                keyupEvent.initEvent('keyup', true, true);
                keyupEvent.keyCode = 13;
                viewModel.current('Knockout ------ Something to do ' + i);
                newTodo.dispatchEvent(keyupEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Ember',
    url: 'todomvc/emberjs/index.html',
    version: '1.4.0 + Handlebars 1.3.0',
    prepare: function (runner, contentWindow, contentDocument) {
        contentWindow.Todos.Store = contentWindow.DS.Store.extend({
            revision: 12,
            adapter: 'Todos.LSAdapter',
            commit: function () { }
        });

        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return {
                newTodo: element,
                views: contentWindow.Ember.View.views,
                emberRun: contentWindow.Ember.run
            }
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (params, contentWindow) {
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                params.emberRun(function () { params.views["new-todo"].set('value', 'Ember --------- Something to do ' + i); });
                params.emberRun(function () {
                    var keyupEvent = document.createEvent('Event');
                    keyupEvent.initEvent('keyup', true, true);
                    keyupEvent.keyCode = 13;
                    params.newTodo.dispatchEvent(keyupEvent)
                });
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (params, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.ember-checkbox');
            for (var i = 0; i < checkboxes.length; i++) {
                var view = params.views[checkboxes[i].id];
                params.emberRun(function () { view.set('checked', true); });
            }
        }),
        new BenchmarkTestStep('DeletingItems', function (params, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                params.emberRun(function () { deleteButtons[i].click(); });
        })
    ]
});

Suites.push({
    name: 'Angular',
    url: 'todomvc/angularjs-perf/index.html',
    version: '1.2.14',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            var submitEvent = document.createEvent('Event');
            submitEvent.initEvent('submit', true, true);
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var inputEvent = document.createEvent('Event');
                inputEvent.initEvent('input', true, true);
                newTodo.value = 'Angular ------- Something to do ' + i;
                newTodo.dispatchEvent(inputEvent);
                newTodo.form.dispatchEvent(submitEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Plastiq',
    url: 'todomvc/plastiq/index.html',
    version: '1.24.0 + virtual-dom 2.1.1',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('.new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            var submitEvent = document.createEvent('Event');
            submitEvent.initEvent('submit', true, true);
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var inputEvent = document.createEvent('Event');
                inputEvent.initEvent('input', true, true);
                newTodo.value = 'Plastiq ------- Something to do ' + i;
                newTodo.dispatchEvent(inputEvent);
                newTodo.form.dispatchEvent(submitEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            console.log('checkboxes.length', checkboxes.length);
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            console.log('deleteButtons.length', deleteButtons.length);
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'React',
    url: 'todomvc/react/index.html',
    version: '0.10.0',
    prepare: function (runner, contentWindow, contentDocument) {
        contentWindow.Utils.store = function () {}
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var keydownEvent = document.createEvent('Event');
                keydownEvent.initEvent('keydown', true, true);
                keydownEvent.which = 13; // VK_ENTER
                newTodo.value = 'React --------- Something to do ' + i;
                newTodo.dispatchEvent(keydownEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Om',
    url: 'todomvc/om/index.html',
    version: '? + React 0.8.0',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            var todomvc = contentWindow.todomvc;
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var keydownEvent = document.createEvent('Event');
                keydownEvent.initEvent('keydown', true, true);
                keydownEvent.which = 13; // VK_ENTER
                newTodo.value = 'Om.? React.8 -- Something to do ' + i;
                newTodo.dispatchEvent(keydownEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Om v',
    url: 'todomvc/om05/index.html',
    version: '0.5.0 + React 0.9.0',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            var todomvc = contentWindow.todomvc;
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var keydownEvent = document.createEvent('Event');
                keydownEvent.initEvent('keydown', true, true);
                keydownEvent.which = 13; // VK_ENTER
                newTodo.value = 'Om.5 React.9 -- Something to do ' + i;
                newTodo.dispatchEvent(keydownEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Ractive',
    url: 'todomvc/ractive/index.html',
    version: '0.3.9',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var keydownEvent = document.createEvent('Event');
                keydownEvent.initEvent('keydown', true, true);
                keydownEvent.which = 13; // VK_ENTER
                newTodo.value = 'Ractive ------- Something to do ' + i;
                newTodo.dispatchEvent(keydownEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

if (!navigator.userAgent.match("MSIE 9.0")) {
    Suites.push({
        name: 'Quiescent',
        url: 'todomvc/quiescent/index.html',
        version: '?',
        prepare: function (runner, contentWindow, contentDocument) {
            return runner.waitForElement('#new-todo').then(function (element) {
                element.focus();
                return element;
            });
        },
        tests: [
            new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
                for (var i = 0; i < numberOfItemsToAdd; i++) {
                    var inputEvent = document.createEvent('Event');
                    inputEvent.initEvent('input', true, true);
                    newTodo.value = 'Quiescent ----- Something to do ' + i;
                    newTodo.dispatchEvent(inputEvent);

                    var keydownEvent = document.createEvent('Event');
                    keydownEvent.initEvent('keydown', true, true);
                    keydownEvent.keyCode = 13; // VK_ENTER
                    newTodo.dispatchEvent(keydownEvent);
                }
            }),
            new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
                var checkboxes = contentDocument.querySelectorAll('.toggle');
                for (var i = 0; i < checkboxes.length; i++)
                    checkboxes[i].click();
            }),
            new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
                var deleteButtons = contentDocument.querySelectorAll('.destroy');
                for (var i = deleteButtons.length - 1; i > -1; i--)
                    deleteButtons[i].click();
            })
        ]
    });
}

Suites.push({
    name: 'Mercury',
    url: 'todomvc/mercury/index.html',
    version: '3.1.7',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var inputEvent = document.createEvent('Event');
                inputEvent.initEvent('input', true, true);
                newTodo.value = 'Mercury -------- Something to do ' + i;
                newTodo.dispatchEvent(inputEvent);

                var keydownEvent = document.createEvent('Event');
                keydownEvent.initEvent('keydown', true, true);
                keydownEvent.keyCode = 13; // VK_ENTER
                newTodo.dispatchEvent(keydownEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Mercury (thunks)',
    url: 'todomvc/mercury_thunks/index.html',
    version: '6.0.0 + virtual-dom 0.16',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var inputEvent = document.createEvent('Event');
                inputEvent.initEvent('input', true, true);
                newTodo.value = 'Mercury (thunks) Something to do ' + i;
                newTodo.dispatchEvent(inputEvent);

                var keydownEvent = document.createEvent('Event');
                keydownEvent.initEvent('keydown', true, true);
                keydownEvent.keyCode = 13; // VK_ENTER
                newTodo.dispatchEvent(keydownEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Elm',
    url: 'todomvc/elm/index.html',
    version: '0.12.3 + virtual-dom 0.8',
    prepare: function (runner, contentWindow, contentDocument) {
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                var inputEvent = document.createEvent('Event');
                inputEvent.initEvent('input', true, true);
                newTodo.value = 'Elm ----------- Something to do ' + i;
                newTodo.dispatchEvent(inputEvent);

                var keydownEvent = document.createEvent('Event');
                keydownEvent.initEvent('keydown', true, true);
                keydownEvent.keyCode = 13; // VK_ENTER
                newTodo.dispatchEvent(keydownEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});

Suites.push({
    name: 'Likely.js',
    url: 'todomvc/likelyjs/index.html',
    version: '0.9.1',
    prepare: function (runner, contentWindow, contentDocument) {
        //contentWindow.likely.sync = function () {}
        contentWindow.data.items = [];
        return runner.waitForElement('#new-todo').then(function (element) {
            element.focus();
            return element;
        });
    },
    tests: [
        new BenchmarkTestStep('Adding' + numberOfItemsToAdd + 'Items', function (newTodo, contentWindow, contentDocument) {
            var changeEvt = document.createEvent('Event');
            changeEvt.initEvent('change', true, true);
            var keydownEvent = document.createEvent('Event');
            keydownEvent.initEvent('keydown', true, true);
            keydownEvent.which = 13;
            for (var i = 0; i < numberOfItemsToAdd; i++) {
                newTodo.value = 'Likely.js ----- Something to do ' + i;
                newTodo.dispatchEvent(changeEvt);
                newTodo.dispatchEvent(keydownEvent);
            }
        }),
        new BenchmarkTestStep('CompletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var checkboxes = contentDocument.querySelectorAll('.toggle');
            for (var i = 0; i < checkboxes.length; i++)
                checkboxes[i].click();
        }),
        new BenchmarkTestStep('DeletingAllItems', function (newTodo, contentWindow, contentDocument) {
            var deleteButtons = contentDocument.querySelectorAll('.destroy');
            for (var i = deleteButtons.length - 1; i > -1; i--)
                deleteButtons[i].click();
        })
    ]
});


shuffle(Suites)
