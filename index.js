((angular) => {
    class UiGridMetrics {
        headerFont;
        cellFont;
        padding;
        border;

        constructor() {
        }

        static getFontStringFrom({fontStyle, fontVariant, fontWeight, fontSize, fontFamily}) {
            return `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize} ${fontFamily}`;
        }

        getHeaderFont() {
            if (this.headerFont) {
                return this.headerFont;
            }

            const elem = document.createElement('div');
            const inner = document.createElement('div');
            inner.className = 'ui-grid-cell-contents';
            elem.className = 'ui-grid-header-cell';
            elem.append(inner);
            document.body.append(elem);

            let headerStyle = getComputedStyle(inner);
            this.headerFont = UiGridMetrics.getFontStringFrom(headerStyle);
            inner.remove();
            elem.remove();
            return this.headerFont;
        }

        getCellFont() {
            if (this.cellFont) {
                return this.cellFont;
            }

            const elem = document.createElement('div');
            const inner = document.createElement('div');
            inner.className = 'ui-grid-cell-contents';
            elem.className = 'ui-grid-cell';
            elem.append(inner);
            document.body.append(elem);

            let cellStyle = getComputedStyle(inner);
            this.cellFont = UiGridMetrics.getFontStringFrom(cellStyle);
            inner.remove();
            elem.remove();
            return this.cellFont;
        }

        getPadding() {
            if (this.padding) {
                return this.padding;
            }

            const elem = document.createElement('div');
            const inner = document.createElement('div');
            inner.className = 'ui-grid-cell-contents';
            elem.className = 'ui-grid-header-cell';
            elem.append(inner);
            document.body.append(elem);

            let {paddingLeft, paddingRight} = getComputedStyle(inner);
            this.padding = parseInt(paddingLeft) + parseInt(paddingRight);
            inner.remove();
            elem.remove();
            return this.padding;
        }

        getBorder() {
            if (this.border) {
                return this.border;
            }

            const elem = document.createElement('div');
            elem.className = 'ui-grid-header-cell';
            document.body.append(elem);

            let {borderRightWidth} = getComputedStyle(elem);
            this.border = parseInt(borderRightWidth);
            elem.remove();
            return this.border;
        }

        getHeaderButtonsWidth() {
            const HEADER_BUTTONS_WIDTH = 27;
            return HEADER_BUTTONS_WIDTH;
        }
    }

    class UiGridFitColumnsService {
        static minColWidth = 80;
        _$q;
        _grid;

        constructor($q, grid) {
            this._$q = $q;
            this._grid = grid;


            grid.registerColumnBuilder((colDef, col, gridOptions) =>
                this.colAutoFitColumnBuilder(colDef, col, gridOptions));

            grid.registerColumnsProcessor((renderedColumnsToProcess, rows) =>
                this.columnsProcessor(renderedColumnsToProcess, rows), 60);
        }

        static isResizable = (colDef) => !colDef.hasOwnProperty('width');

        static defaultGridOptions = (gridOptions) => {
            gridOptions.enableColumnAutoFit = gridOptions.enableColumnAutoFit !== false;
        };

        static measureTextWidth = (text, font) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            context.font = font;
            const metrics = context.measureText(text);
            canvas.remove();
            return metrics.width;
        };

        static measureRoundedTextWidth = (text, font) =>
            Math.floor(UiGridFitColumnsService.measureTextWidth(text, font)) + 1;

        colAutoFitColumnBuilder(colDef, col, gridOptions) {
            const promises = [];

            if (colDef.enableColumnAutoFit === undefined) {
                if (UiGridFitColumnsService.isResizable(colDef)) {
                    colDef.enableColumnAutoFit = gridOptions.enableColumnAutoFit;
                } else {
                    colDef.enableColumnAutoFit = false;
                }
            }

            return this._$q.all(promises);
        };

        columnsProcessor(renderedColumnsToProcess, rows) {
            if (!rows.length) {
                return renderedColumnsToProcess;
            }

            let optimalWidths = {};
            const gridMetrics = new UiGridMetrics();

            renderedColumnsToProcess.forEach(column => {
                if (column.colDef.enableColumnAutoFit) {
                    const columnKey = column.field || column.name;
                    optimalWidths[columnKey] = UiGridFitColumnsService.measureRoundedTextWidth(
                        column.displayName,
                        gridMetrics.getHeaderFont()
                    ) + gridMetrics.getPadding() + gridMetrics.getHeaderButtonsWidth();

                    rows.forEach((row) => {
                        const cellText = row.grid.getCellDisplayValue(row, column);
                        const currentCellWidth =
                            UiGridFitColumnsService.measureRoundedTextWidth(cellText, gridMetrics.getCellFont());

                        if (currentCellWidth > optimalWidths[columnKey]) {
                            optimalWidths[columnKey] = currentCellWidth;
                        }
                    });

                    const width = optimalWidths[columnKey] + gridMetrics.getPadding() + gridMetrics.getBorder();
                    column.colDef.width =
                        Math.max(column.colDef.minWidth || UiGridFitColumnsService.minColWidth, width);

                    if (column.colDef.maxWidth) {
                        column.colDef.width = Math.min(column.colDef.maxWidth, column.colDef.width);
                    }

                    column.updateColumnDef(column.colDef, false);
                }
            });

            return renderedColumnsToProcess;
        };
    }

    angular
        .module('ui.grid.fitColumns', ['ui.grid'])
        .service('uiGridFitColumnsService', [
            '$q',
            function ($q) {
                return {
                    initializeGrid: (grid) => {
                        const service = new UiGridFitColumnsService($q, grid);

                        UiGridFitColumnsService.defaultGridOptions(grid.options);
                    }
                }
            }
        ])
        .directive('uiGridFitColumns', [
            'uiGridFitColumnsService',
            function (uiGridFitColumnsService) {
                return {
                    replace: true,
                    priority: 0,
                    require: '^uiGrid',
                    scope: false,
                    compile: function () {
                        return {
                            post: function ($scope, $elm, $attrs, uiGridCtrl) {
                                uiGridFitColumnsService.initializeGrid(uiGridCtrl.grid);
                            }
                        };
                    }
                };
            }
        ]);

})(angular);
