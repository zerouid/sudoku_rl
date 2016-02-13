$(function () {
    var $puzzle_table,
        $puzzle_list = $('#puzzle-list');

    function createSudokuGrid() {
        $puzzle_table = $('<table>').addClass('sudoku');
        for (i = 0; i < 9; i++) {
            var $row = $('<tr>');
            for (j = 0; j < 9; j++) {
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
                    })
                })
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

    createSudokuGrid();
});
