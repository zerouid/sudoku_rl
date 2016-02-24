/*global  $*/
$(function () {
    'use strict';
    var $puzzle_table,
        $puzzle_list = $('#puzzle-list'),
        current_puzzle;

    function createSudokuGrid() {
        var i, j, $row;
        $puzzle_table = $('<table>').addClass('sudoku');
        for (i = 0; i < 9; i += 1) {
            $row = $('<tr>');
            for (j = 0; j < 9; j += 1) {
                $('<td>').attr('id', i + '_' + j).appendTo($row);
            }
            $row.appendTo($puzzle_table);
        }
        $puzzle_table.appendTo('#puzzle');
    }

    function loadPuzzle(fname) {
        $.get('/api/dk_puzzle/' + fname)
            .done(function (data) {
                $.each(data, function (i, v) {
                    $.each(v, function (ii, vv) {
                        $puzzle_table.find('#' + i + '_' + ii).text(vv.fixed === 'True' ? vv.value : 'x');
                        current_puzzle.push(parseInt(vv.value, 10));
                    });
                });
            })
            .fail(function (error) {
                console.log(error);
            });
    }

    function loadPuzzleList() {
        $.get('/api/dk_puzzles')
            .done(function (data) {
                $.each(data, function (i, v) {
                    $('<a>').addClass('list-group-item')
                        .text(v.text)
                        .click(function () {
                            $(this).siblings().removeClass('active');
                            $(this).addClass('active');
                            loadPuzzle(v.fname);
                        })
                        .appendTo($puzzle_list);
                });
            })
            .fail(function (error) {
                console.log(error);
            });
    }

    $("#reload-button").click(function () {
        $puzzle_list.empty();
        loadPuzzleList();
    });

    function startLearning() {
        var num_inputs = 81, // 81 eyes, each sees the number in the grid
            num_actions = 81, // 81 possible combinations agent can set
            temporal_window = 1, // amount of temporal memory. 0 = agent lives in-the-moment :)
            network_size = num_inputs * temporal_window + num_actions * temporal_window + num_inputs,
            opt = {},
            layer_defs = [],
            tdtrainer_options,
            brain,
            deepqlearn;

        // the value function network computes a value of taking any of the possible actions
        // given an input state. Here we specify one explicitly the hard way
        // but user could also equivalently instead use opt.hidden_layer_sizes = [20,20]
        // to just insert simple relu hidden layers.
        layer_defs.push({
            type: 'input',
            out_sx: 1,
            out_sy: 1,
            out_depth: network_size
        });
        layer_defs.push({
            type: 'fc',
            num_neurons: 100,
            activation: 'relu'
        });
        layer_defs.push({
            type: 'fc',
            num_neurons: 100,
            activation: 'relu'
        });
        layer_defs.push({
            type: 'regression',
            num_neurons: num_actions
        });

        // options for the Temporal Difference learner that trains the above net
        // by backpropping the temporal difference learning rule.
        tdtrainer_options = {
            learning_rate: 0.001,
            momentum: 0.0,
            batch_size: 64,
            l2_decay: 0.01
        };

        opt.temporal_window = temporal_window;
        opt.experience_size = 30000;
        opt.start_learn_threshold = 1000;
        opt.gamma = 0.7;
        opt.learning_steps_total = 200000;
        opt.learning_steps_burnin = 3000;
        opt.epsilon_min = 0.05;
        opt.epsilon_test_time = 0.05;
        opt.layer_defs = layer_defs;
        opt.tdtrainer_options = tdtrainer_options;

        brain = new deepqlearn.Brain(num_inputs, num_actions, opt); // woohoo

    }

    createSudokuGrid();
});
