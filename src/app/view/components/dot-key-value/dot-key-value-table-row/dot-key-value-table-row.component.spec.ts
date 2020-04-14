import { By } from '@angular/platform-browser';
import { ComponentFixture } from '@angular/core/testing';
import {
    DebugElement,
    Component,
    Directive,
    Input,
    AfterContentInit,
    ContentChildren,
    QueryList,
    TemplateRef
} from '@angular/core';
import { DotKeyValueTableRowComponent } from './dot-key-value-table-row.component';
import { DotIconButtonModule } from '@components/_common/dot-icon-button/dot-icon-button.module';
import { MockDotMessageService } from '@tests/dot-message-service.mock';
import { DOTTestBed } from '@tests/dot-test-bed';
import { DotMessageService } from '@services/dot-messages-service';
import { PrimeTemplate, InputSwitchModule } from 'primeng/primeng';
import { DotMessageDisplayService } from '@components/dot-message-display/services';
import { DotKeyValue } from '@shared/models/dot-key-value/dot-key-value.model';
import { mockKeyValue } from '../dot-key-value.component.spec';

@Component({
    selector: 'dot-test-host-component',
    template: `
        <dot-key-value-table-row
            [variable]="variable"
            [variableIndex]="variableIndex"
            [variablesList]="variablesList"
        >
        </dot-key-value-table-row>
    `
})
class TestHostComponent {
    @Input() variable: DotKeyValue;
    @Input() variableIndex: number;
    @Input() variablesList: DotKeyValue[];
}

@Directive({
    // tslint:disable-next-line:directive-selector
    selector: '[pEditableColumn]'
})
class MockEditableColumnDirective {
    @Input()
    public pEditableColumn: any;
    @Input()
    public pEditableColumnField: any;
}

@Component({
    // tslint:disable-next-line:component-selector
    selector: 'p-cellEditor',
    template: `
        <ng-container>
            <ng-container *ngTemplateOutlet="inputTemplate"></ng-container>
        </ng-container>
    `
})
class MockCellEditorComponent implements AfterContentInit {
    @ContentChildren(PrimeTemplate) templates: QueryList<PrimeTemplate>;
    inputTemplate: TemplateRef<any>;
    outputTemplate: TemplateRef<any>;

    constructor(public tableRow: DotKeyValueTableRowComponent) {}

    ngAfterContentInit() {
        this.templates.forEach((item) => {
            switch (item.getType()) {
                case 'input':
                    this.inputTemplate = item.template;
                    break;
                case 'output':
                    this.outputTemplate = item.template;
                    break;
            }
        });
    }
}

describe('DotKeyValueTableRowComponent', () => {
    let comp: DotKeyValueTableRowComponent;
    let hostComponent: TestHostComponent;
    let hostComponentfixture: ComponentFixture<TestHostComponent>;
    let de: DebugElement;
    let dotMessageDisplayService: DotMessageDisplayService;

    beforeEach(() => {
        const messageServiceMock = new MockDotMessageService({
            'keyValue.key_input.placeholder': 'Enter Key',
            'keyValue.value_input.placeholder': 'Enter Value',
            Save: 'Save',
            Cancel: 'Cancel',
            'keyValue.error.duplicated.variable': 'test {0}'
        });

        DOTTestBed.configureTestingModule({
            declarations: [
                DotKeyValueTableRowComponent,
                MockCellEditorComponent,
                MockEditableColumnDirective,
                TestHostComponent
            ],
            imports: [DotIconButtonModule, InputSwitchModule],
            providers: [
                { provide: DotMessageService, useValue: messageServiceMock },
                DotMessageDisplayService
            ]
        }).compileComponents();

        hostComponentfixture = DOTTestBed.createComponent(TestHostComponent);
        hostComponent = hostComponentfixture.componentInstance;
        comp = hostComponentfixture.debugElement.query(By.css('dot-key-value-table-row'))
            .componentInstance;
        de = hostComponentfixture.debugElement.query(By.css('dot-key-value-table-row'));

        dotMessageDisplayService = de.injector.get(DotMessageDisplayService);
        hostComponent.variableIndex = 0;
        hostComponent.variablesList = mockKeyValue;
    });

    it('should load the component', () => {
        hostComponent.variableIndex = 1;
        hostComponent.variable = mockKeyValue[0];
        hostComponentfixture.detectChanges();
        const inputs = de.queryAll(By.css('input'));
        const btns = de.queryAll(By.css('button'));
        expect(inputs[0].nativeElement.placeholder).toContain('Enter Value');
        expect(btns[0].nativeElement.innerText).toContain('delete_outline');
        expect(btns[1].nativeElement.innerText).toContain('edit');
        expect(comp.saveDisabled).toBe(false);
    });

    it('should focus on "Key" input when an empty variable is added', (done) => {
        hostComponent.variable = {
            key: '',
            value: ''
        };
        hostComponentfixture.detectChanges();
        de.query(By.css('.field-key-input')).triggerEventHandler('focus', {});
        spyOn(comp.keyCell.nativeElement, 'click');
        hostComponentfixture.detectChanges();
        setTimeout(() => {
            expect(comp.saveDisabled).toBe(true);
            expect(comp.keyCell.nativeElement.click).toHaveBeenCalled();
            done();
        }, 0);
    });

    it('should focus on "Value" input when "Edit" button clicked', () => {
        hostComponent.variableIndex = 1;
        hostComponent.variable = { key: 'TestKey', value: 'TestValue' };
        console.log(comp);
        hostComponentfixture.detectChanges();
        spyOn(comp.valueCell.nativeElement, 'click');
        const button = de.queryAll(
            By.css('.dot-key-value-table-row__variables-actions dot-icon-button')
        )[1];
        button.triggerEventHandler('click', {
            stopPropagation: () => {}
        });
        hostComponentfixture.detectChanges();
        expect(comp.valueCell.nativeElement.click).toHaveBeenCalled();
    });

    it('should show edit menu when focus/key.up on a field', () => {
        hostComponent.variable = mockKeyValue[0];
        hostComponentfixture.detectChanges();
        expect(comp.rowActiveHighlight).toBe(false);
        expect(comp.showEditMenu).toBe(false);
        expect(comp.saveDisabled).toBe(false);
        de.query(By.css('.field-value-input')).triggerEventHandler('keyup', {
            target: { value: 'a' }
        });
        hostComponentfixture.detectChanges();
        expect(comp.rowActiveHighlight).toBe(true);
        expect(comp.showEditMenu).toBe(true);
        expect(comp.saveDisabled).toBe(false);
    });

    it('should focus on "Value" field, if entered valid "Key"', () => {
        hostComponent.variable = { key: 'test', value: '' };
        hostComponentfixture.detectChanges();
        de.query(By.css('.field-key-input')).nativeElement.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter' })
        );
        expect(comp.elemRef).toBe(comp.valueCell);
    });

    it('should focus on "Key" field, if entered invalid "Key"', () => {
        hostComponent.variable = { key: '', value: '' };
        hostComponentfixture.detectChanges();
        de.query(By.css('.field-key-input')).nativeElement.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter' })
        );
        expect(comp.elemRef).toBe(comp.keyCell);
    });

    it('should emit cancel event when press "Escape"', () => {
        hostComponent.variable = mockKeyValue[0];
        hostComponentfixture.detectChanges();
        spyOn(comp.cancel, 'emit');
        hostComponentfixture.detectChanges();
        de.query(By.css('.field-value-input')).nativeElement.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape' })
        );
        expect(comp.cancel.emit).toHaveBeenCalledWith(comp.variableIndex);
    });

    it('should disabled save button when new variable key added is duplicated', () => {
        hostComponent.variable = { key: 'name', value: '' };
        hostComponent.variablesList = [hostComponent.variable, ...mockKeyValue];
        hostComponentfixture.detectChanges();
        spyOn(dotMessageDisplayService, 'push');
        de.query(By.css('.field-key-input')).triggerEventHandler('blur', {
            type: 'blur',
            target: { value: 'Key1' }
        });
        hostComponentfixture.detectChanges();
        const saveBtn = de.query(By.css('.dot-key-value-table-row__variables-actions-edit-save'))
            .nativeElement;
        hostComponentfixture.detectChanges();
        expect(saveBtn.disabled).toBe(true);
        expect(dotMessageDisplayService.push).toHaveBeenCalled();
    });

    it('should emit save event when button clicked and not modify "isEditing" variable when component gets updated', () => {
        hostComponent.variable = { key: 'Key1', value: 'Value1' };
        hostComponentfixture.detectChanges();
        spyOn(comp.save, 'emit');
        de.query(By.css('.field-value-input')).triggerEventHandler('focus', {});
        hostComponentfixture.detectChanges();
        de.query(
            By.css('.dot-key-value-table-row__variables-actions-edit-save')
        ).triggerEventHandler('click', {});
        hostComponent.variablesList = [];
        hostComponentfixture.detectChanges();
        expect(comp.save.emit).toHaveBeenCalledWith(comp.variableIndex);
        expect(comp.isEditing).toBe(true);
    });

    it('should emit cancel event when button clicked', () => {
        hostComponent.variable = { key: 'Key1', value: 'Value1' };
        hostComponentfixture.detectChanges();
        spyOn(comp.save, 'emit');
        de.query(By.css('.field-value-input')).triggerEventHandler('focus', {});
        spyOn(comp.cancel, 'emit');
        hostComponentfixture.detectChanges();
        de.query(
            By.css('.dot-key-value-table-row__variables-actions-edit-cancel')
        ).triggerEventHandler('click', { stopPropagation: () => {} });
        expect(comp.cancel.emit).toHaveBeenCalledWith(comp.variableIndex);
    });

    it('should emit delete event when button clicked', () => {
        hostComponent.variableIndex = 1;
        hostComponent.variable = { key: 'TestKey', value: 'TestValue' };
        spyOn(comp.delete, 'emit');
        hostComponentfixture.detectChanges();
        de.queryAll(
            By.css('.dot-key-value-table-row__variables-actions dot-icon-button')
        )[0].triggerEventHandler('click', {});
        expect(comp.delete.emit).toHaveBeenCalledWith(comp.variableIndex);
    });
});
