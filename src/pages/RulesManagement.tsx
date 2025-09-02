import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sidebar } from '../components/Sidebar';
import { toast } from '../hooks/use-toast';
import * as apiService from '../services/api';
import { Trash2, Edit, Lock } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

interface Rule {
  rule_id: number;
  rule_name: string;
  description: string;
  column_name: string;
  parameters: string;
  is_custom: boolean;
  template_id?: number;
}

interface Template {
  template_id: number;
  template_name: string;
  is_corrected?: boolean;
}

interface ColumnRule {
  column_name: string;
  rule_name: string;
}

const arithmeticOperators = ['+', '-', '/', '%', '*'];
const logicalOperators = ['AND', 'OR'];
const comparisonOperators = ['=', '>', '<', '>=', '<='];
const columnDataTypes: { [key: string]: string } = {
  'name': 'Text',
  'age': 'Int',
  'salary': 'Float',
  'int': 'Int',
  'float': 'Float',
  'text': 'Text',
  'email': 'Email',
  'date': 'Date',
  'boolean': 'Boolean',
  'period': 'Text',
  'cgst': 'Float',
  'sgst': 'Float',
  'igst': 'Float',
  'gst': 'Float',
  'loss': 'Float',
  'address': 'Text',
  'phone': 'Text',
  'id': 'Int',
  'username': 'Text',
  'status': 'Text',
  'created_at': 'Date',
  'updated_at': 'Date',
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
            <p className="text-red-600 mt-2">{this.state.error || 'An unexpected error occurred'}</p>
            <Button
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const RulesManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const fromRoute = query.get('from');
  const step = query.get('step');
  const navigatedTemplateId = query.get('templateId') ? Number(query.get('templateId')) : null;

  const [rules, setRules] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [ruleForm, setRuleForm] = useState({
    rule_name: '',
    description: '',
    column_name: '',
    formula: [] as string[],
  });
  const [editRule, setEditRule] = useState<Rule | null>(null);
  const [checkedRules, setCheckedRules] = useState<{ [key: number]: boolean }>({});
  const [integerDialogOpen, setIntegerDialogOpen] = useState(false);
  const [isDropdownLocked, setIsDropdownLocked] = useState<boolean>(false);
  const [lockedTemplateName, setLockedTemplateName] = useState<string>('');
  const [integerValue, setIntegerValue] = useState('');
  const [columnRules, setColumnRules] = useState<ColumnRule[]>([]);

  const customStyles = `
    .formula-container {
      display: flex !important;
      flex-direction: row !important;
      justify-content: flex-start !important;
      flex-wrap: nowrap !important;
      direction: ltr !important;
      text-align: left !important;
    }
    .formula-container > * {
      order: unset !important;
    }
  `;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const templatesResponse = await apiService.getTemplates();
        console.log('Templates response:', JSON.stringify(templatesResponse.data, null, 2));
        const templates = templatesResponse.data?.templates?.filter((t: Template) => !t.is_corrected) || [];
        if (!Array.isArray(templates)) {
          throw new Error('Invalid templates data: Expected an array');
        }
        setTemplates(templates);
        console.log('Fetched templates:', templates);
        if (navigatedTemplateId && fromRoute === 'rule-configurations') {
          console.log(`Locking dropdown to template ID: ${navigatedTemplateId}`);
          
          const targetTemplate = templates.find(t => t.template_id === navigatedTemplateId);
          
          if (targetTemplate) {
            setSelectedTemplateId(navigatedTemplateId);
            setIsDropdownLocked(true);
            setLockedTemplateName(targetTemplate.template_name);
            console.log(`Dropdown locked to: ${targetTemplate.template_name}`);
          } else {
            console.warn(`Template ID ${navigatedTemplateId} not found in templates`);
            toast({
              title: 'Warning',
              description: `Template ID ${navigatedTemplateId} not found. Please select a template.`,
              variant: 'default',
            });
          }
        } else if (navigatedTemplateId && templates.some(t => t.template_id === navigatedTemplateId)) {
          console.log(`Setting selectedTemplateId to navigatedTemplateId: ${navigatedTemplateId}`);
          setSelectedTemplateId(navigatedTemplateId);
        } else if (navigatedTemplateId) {
          console.warn(`Template ID ${navigatedTemplateId} not found in templates`);
          toast({
            title: 'Warning',
            description: `Template ID ${navigatedTemplateId} not found. Please select a template.`,
            variant: 'default',
          });
        }
        if (templates.length === 0) {
          toast({
            title: 'Warning',
            description: 'No templates available. Please upload a template first.',
            variant: 'default',
          });
        }
      } catch (error: any) {
        console.error('Error fetching templates:', {
          message: error.message,
          response: error.response?.data,
          stack: error.stack,
        });
        toast({
          title: 'Error',
          description: error.response?.data?.error || error.message || 'Something went wrong while loading templates.',
          variant: 'destructive',
        });
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigatedTemplateId]);

  useEffect(() => {
    const fetchTemplateData = async () => {
      if (selectedTemplateId) {
        try {
          const initialResponse = await apiService.getTemplate(selectedTemplateId, 'Sheet1');
          const sheetName = initialResponse.data.sheet_name || 'Sheet1';
          console.log('Using sheetName:', sheetName);

          const [templateResponse, rulesResponse, templateRulesResponse] = await Promise.all([
            apiService.getTemplate(selectedTemplateId, sheetName),
            apiService.getRules(),
            apiService.getTemplateRules(selectedTemplateId),
          ]);

          const templateData = templateResponse.data;
          console.log('Template data:', JSON.stringify(templateData, null, 2));

          if (!templateData.sheet_name || !templateData.sheets || !templateData.sheets[templateData.sheet_name]) {
            throw new Error('Invalid template data: Missing sheet_name or sheets data.');
          }

          const headers = templateData.sheets[templateData.sheet_name].headers || [];
          if (!Array.isArray(headers) || headers.length === 0) {
            toast({
              title: 'Warning',
              description: 'No headers found in the template.',
              variant: 'default',
            });
          }

          setHeaders(headers);
          const filteredRules = rulesResponse.data.rules.filter(
            (rule: Rule) => 
              rule.template_id === selectedTemplateId && 
              rule.is_custom && 
              !rule.rule_name.startsWith('Date(') && 
              !rule.rule_name.startsWith('Transform-Date(')
          ) || [];
          setRules(filteredRules);
          setCheckedRules(filteredRules.reduce((acc, rule) => ({ ...acc, [rule.rule_id]: true }), {}));

          // Process configured rules to map headers to their data types
          const rules = templateRulesResponse.data.rules || {};
          console.log('Template rules response:', JSON.stringify(rules, null, 2));
          const columnRulesArray: ColumnRule[] = [];
          Object.entries(rules).forEach(([column_name, ruleNames]) => {
            console.log(`Processing column: ${column_name}, rules: ${ruleNames}`);
            if (Array.isArray(ruleNames)) {
              ruleNames.forEach((rule_name) => {
                if (['Int', 'Float', 'Text', 'Email', 'Date', 'Boolean', 'Alphanumeric'].includes(rule_name)) {
                  columnRulesArray.push({ column_name: column_name.trim(), rule_name });
                }
              });
            }
          });
          setColumnRules(columnRulesArray);
          console.log('Processed column rules:', JSON.stringify(columnRulesArray, null, 2));
        } catch (error: any) {
          console.error('Error fetching template data:', {
            message: error.message,
            response: error.response?.data,
            templateId: selectedTemplateId,
          });
          toast({
            title: 'Error',
            description: error.response?.data?.error || 'Failed to load template data. Please try again or contact support.',
            variant: 'destructive',
          });
          setHeaders([]);
          setRules([]);
          setColumnRules([]);
        }
      } else {
        setHeaders([]);
        setRules([]);
        setColumnRules([]);
      }
    };
    fetchTemplateData();
  }, [selectedTemplateId]);

  const getColumnDataType = (header: string): string => {
    const rule = columnRules.find((r) => r.column_name.toLowerCase() === header.toLowerCase());
    console.log(`getColumnDataType for header: ${header}, found rule:`, rule);
    if (rule && ['Int', 'Float', 'Text', 'Email', 'Date', 'Boolean', 'Alphanumeric'].includes(rule.rule_name)) {
      return rule.rule_name;
    }
    const fallbackType = columnDataTypes[header.toLowerCase()] || 'Unknown';
    console.log(`Falling back to columnDataTypes for ${header}: ${fallbackType}`);
    return fallbackType;
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) {
      console.log('No destination, drag cancelled');
      return;
    }

    if (destination.droppableId === 'formula') {
      let draggedItem: string;

      if (source.droppableId === 'columns' && selectedTemplateId) {
        const column = headers[source.index];
        draggedItem = `'${column}'`;
        const selectedColumnType = columnDataTypes[ruleForm.column_name.toLowerCase()] || getColumnDataType(ruleForm.column_name);
        const draggedColumnType = columnDataTypes[column.toLowerCase()] || getColumnDataType(column);
        console.log(`Drag validation: selected column=${ruleForm.column_name} (${selectedColumnType}), dragged column=${column} (${draggedColumnType})`);
        if (ruleForm.column_name && selectedColumnType !== draggedColumnType && selectedColumnType !== 'Unknown' && draggedColumnType !== 'Unknown') {
          toast({
            title: 'Invalid Column',
            description: `Column '${column}' (type: ${draggedColumnType}) does not match selected column '${ruleForm.column_name}' (type: ${selectedColumnType}).`,
            variant: 'destructive',
          });
          return;
        }
      } else if (source.droppableId === 'arithmetic-operators') {
        draggedItem = arithmeticOperators[source.index];
      } else if (source.droppableId === 'logical-operators') {
        draggedItem = logicalOperators[source.index];
      } else if (source.droppableId === 'comparison-operators') {
        draggedItem = comparisonOperators[source.index];
      } else if (source.droppableId === 'integer-input') {
        setIntegerDialogOpen(true);
        return;
      } else if (source.droppableId === 'formula') {
        setRuleForm((prev) => {
          const newFormula = [...prev.formula];
          const [movedItem] = newFormula.splice(source.index, 1);
          newFormula.splice(destination.index, 0, movedItem);
          console.log(`Reordered formula: ${newFormula.join(' ')}`);
          return { ...prev, formula: newFormula };
        });
        return;
      } else {
        console.log(`Invalid source droppableId: ${source.droppableId}`);
        return;
      }

      setRuleForm((prev) => {
        const newFormula = [...prev.formula];
        const lastItem = newFormula.length > 0 ? newFormula[newFormula.length - 1] : null;

        if (
          (arithmeticOperators.includes(draggedItem) ||
            logicalOperators.includes(draggedItem) ||
            comparisonOperators.includes(draggedItem)) &&
          lastItem &&
          (arithmeticOperators.includes(lastItem) ||
            logicalOperators.includes(lastItem) ||
            comparisonOperators.includes(lastItem))
        ) {
          toast({
            title: 'Invalid Formula',
            description: 'Cannot place operators consecutively.',
            variant: 'destructive',
          });
          return prev;
        }

        newFormula.push(draggedItem);
        console.log(`Added '${draggedItem}' to formula: ${newFormula.join(' ')}`);
        console.log(`Current formula order: ${newFormula.join(' ')}`);
        return { ...prev, formula: newFormula };
      });
    }
  };

  const handleIntegerSubmit = () => {
    if (!integerValue || isNaN(parseInt(integerValue))) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid integer.',
        variant: 'destructive',
      });
      setIntegerValue('');
      setIntegerDialogOpen(false);
      return;
    }
    const parsedValue = parseInt(integerValue);
    setRuleForm((prev) => {
      const newFormula = [...prev.formula];
      const lastItem = newFormula.length > 0 ? newFormula[newFormula.length - 1] : null;
      if (
        lastItem &&
        (arithmeticOperators.includes(lastItem) ||
          logicalOperators.includes(lastItem) ||
          comparisonOperators.includes(lastItem))
      ) {
        newFormula.push(parsedValue.toString());
        console.log(`Added integer '${parsedValue}' to formula: ${newFormula.join(' ')}`);
        return { ...prev, formula: newFormula };
      } else {
        toast({
          title: 'Invalid Formula',
          description: 'Integer value must follow an operator.',
          variant: 'destructive',
        });
        return prev;
      }
    });
    setIntegerValue('');
    setIntegerDialogOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRuleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string, field: string) => {
    setRuleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddOrUpdateRule = async () => {
    console.log('handleAddOrUpdateRule called with ruleForm:', JSON.stringify(ruleForm));
    if (!selectedTemplateId) {
      console.log('Validation failed: No template selected');
      toast({
        title: 'Error',
        description: 'Please select a template.',
        variant: 'destructive',
      });
      return;
    }
    if (!ruleForm.rule_name || !ruleForm.column_name || ruleForm.formula.length === 0) {
      console.log('Validation failed: Missing rule_name, column_name, or empty formula');
      toast({
        title: 'Error',
        description: 'Rule name, column, and a valid formula are required.',
        variant: 'destructive',
      });
      return;
    }

    // Normalize column_name
    const normalizedColumnName = ruleForm.column_name.trim().toLowerCase();
    console.log('Normalized column_name:', normalizedColumnName);

    // Determine if the formula is a comparison formula
    const isComparisonFormula =
      (ruleForm.formula.length === 2 &&
        comparisonOperators.includes(ruleForm.formula[0]) &&
        /^-?\d+$/.test(ruleForm.formula[1])) || // Comparison with integer (e.g., 'number 1' >= 200)
      (ruleForm.formula.length === 2 &&
        comparisonOperators.includes(ruleForm.formula[0]) &&
        ruleForm.formula[1].startsWith("'") &&
        ruleForm.formula[1].endsWith("'")); // Comparison with another column (e.g., 'cgst' <= 'gst')
    console.log('isComparisonFormula:', isComparisonFormula, 'Formula:', ruleForm.formula);

    // Validate formula based on type
    const selectedColumnType = columnDataTypes[normalizedColumnName] || getColumnDataType(normalizedColumnName);
    console.log('Selected column type:', selectedColumnType);
    if (isComparisonFormula) {
  console.log('Processing comparison formula');
  // For comparison with another column, ensure data types match if both are known
  if (ruleForm.formula.length === 2 && ruleForm.formula[1].startsWith("'") && ruleForm.formula[1].endsWith("'")) {
    const secondColumn = ruleForm.formula[1].slice(1, -1).trim().toLowerCase();
    const secondColumnType = columnDataTypes[secondColumn] || getColumnDataType(secondColumn);
    if (selectedColumnType !== 'Unknown' && secondColumnType !== 'Unknown' && selectedColumnType !== secondColumnType) {
      console.log(
        `Validation failed: Comparison formula requires columns of the same type, got ${selectedColumnType} for ${normalizedColumnName} and ${secondColumnType} for ${secondColumn}`
      );
      toast({
        title: 'Error',
        description: `Comparison formulas require columns of the same type, got ${selectedColumnType} for ${normalizedColumnName} and ${secondColumnType} for ${secondColumn}.`,
        variant: 'destructive',
      });
      return;
    }
  }
  // No data type restriction for any comparison formulas
}else {
      console.log('Processing arithmetic/logical formula');
      // Validate arithmetic/logical formula
      const hasColumn = ruleForm.formula.some((item) => item.startsWith("'") && item.endsWith("'"));
      const hasArithmeticOrLogicalOperator = ruleForm.formula.some((item) =>
        [...arithmeticOperators, ...logicalOperators].includes(item)
      );
      if (!hasColumn || !hasArithmeticOrLogicalOperator) {
        console.log('Validation failed: Arithmetic/logical formula must include at least one column and one operator');
        toast({
          title: 'Error',
          description: 'Arithmetic/logical formulas must contain at least one column and one arithmetic/logical operator (+, -, /, %, *, AND, OR).',
          variant: 'destructive',
        });
        return;
      }
      // Ensure all columns in the formula match the data type of the selected column
      const invalidColumns = ruleForm.formula
        .filter((item) => item.startsWith("'") && item.endsWith("'"))
        .map((item) => item.slice(1, -1).trim().toLowerCase())
        .filter((column) => {
          const columnType = columnDataTypes[column] || getColumnDataType(column);
          return columnType !== 'Unknown' && selectedColumnType !== 'Unknown' && columnType !== selectedColumnType;
        });
      if (invalidColumns.length > 0) {
        console.log(`Validation failed: Mismatched column types: ${invalidColumns.join(', ')}`);
        toast({
          title: 'Error',
          description: `All columns in the formula must match the data type of ${normalizedColumnName} (${selectedColumnType}). Invalid columns: ${invalidColumns.join(', ')}.`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      // Construct the formula string
      const draggedFormula = ruleForm.formula.join(' ');
      const formulaString = isComparisonFormula
        ? `'${normalizedColumnName}' ${draggedFormula}`
        : `'${normalizedColumnName}' = ${draggedFormula}`;
      console.log('Constructed formulaString:', formulaString);
      const data = {
  rule_name: ruleForm.rule_name,
  description: ruleForm.description || '',
  column_name: normalizedColumnName, // Fixed: Use normalizedColumnName
  parameters: formulaString,
  template_id: selectedTemplateId,
};
      console.log('Sending rule data to backend:', JSON.stringify(data));

      if (editRule) {
        await apiService.updateRule(editRule.rule_id, data);
        console.log('Rule updated successfully');
        toast({ title: 'Success', description: 'Rule updated.', variant: 'default' });
        setRules((prev) =>
          prev.map((r) => (r.rule_id === editRule.rule_id ? { ...r, ...data } : r))
        );
        setEditRule(null);
      } else {
        const response = await apiService.createRule(data);
        console.log('Rule created successfully:', response.data);
        toast({ title: 'Success', description: 'Rule created.', variant: 'default' });
        const rulesResponse = await apiService.getRules();
        setRules(rulesResponse.data.rules.filter((rule: Rule) => rule.template_id === selectedTemplateId));
      }
      setRuleForm({ rule_name: '', description: '', column_name: '', formula: [] });
    } catch (error: any) {
      console.error('Error saving rule:', error.response?.data, error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save rule.';
      console.log('Error message received from backend:', errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleEditRule = (rule: Rule) => {
    console.log('Editing rule:', rule);
    const isComparison = comparisonOperators.some(op => rule.parameters.includes(` ${op} `));
    let draggedFormula: string[] = [];
    
    if (isComparison) {
      const parts = rule.parameters.split(' ');
      if (parts.length >= 3) {
        draggedFormula = parts.slice(1);
      }
    } else {
      const formulaParts = rule.parameters ? rule.parameters.split(' = ') : [];
      draggedFormula = formulaParts.length > 1 ? formulaParts[1].split(' ') : formulaParts[0] ? formulaParts[0].split(' ') : [];
    }

    setRuleForm({
      rule_name: rule.rule_name,
      description: rule.description,
      column_name: rule.column_name,
      formula: draggedFormula,
    });
    setEditRule(rule);
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        const response = await apiService.deleteRule(ruleId);
        if (response.data.success) {
          setRules(rules.filter((r) => r.rule_id !== ruleId));
          setCheckedRules((prev) => {
            const newChecked = { ...prev };
            delete newChecked[ruleId];
            return newChecked;
          });
          toast({
            title: 'Success',
            description: response.data.message || 'Rule deleted successfully.',
            variant: 'default',
          });
        } else {
          throw new Error(response.data.message || 'Failed to delete rule.');
        }
      } catch (error: any) {
        console.error('Error deleting rule:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete rule.';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  };

  const removeFormulaItem = (index: number) => {
    setRuleForm((prev) => ({
      ...prev,
      formula: prev.formula.filter((_, i) => i !== index),
    }));
  };

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-gray-50">
        <style>{customStyles}</style>
        <Sidebar />
        <div className="flex-1 p-8">
          <h1 className="text-2xl font-bold mb-6">Rules Management</h1>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Template Custom Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isDropdownLocked ? (
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <Lock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      Configuring Rules for: {lockedTemplateName}
                    </span>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    </span>
                  </div>
                ) : (
                  <Select
                    value={selectedTemplateId?.toString() || ''}
                    onValueChange={(value) => setSelectedTemplateId(Number(value) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.template_id} value={template.template_id.toString()}>
                          {template.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedTemplateId && (
                  <>
                    <Input
                      placeholder="Rule Name"
                      name="rule_name"
                      value={ruleForm.rule_name}
                      onChange={handleInputChange}
                    />
                    <Textarea
                      placeholder="Description"
                      name="description"
                      value={ruleForm.description}
                      onChange={handleInputChange}
                    />
                    <Select
                      value={ruleForm.column_name}
                      onValueChange={(value) => handleSelectChange(value, 'column_name')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <div className="flex flex-row gap-4 overflow-x-auto">
                        <div className="w-[100px]">
                          <h4 className="font-medium mb-2">Columns</h4>
                          <Droppable droppableId="columns" isDropDisabled={true}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="p-2 bg-gray-100 rounded space-y-2 min-h-[100px]"
                              >
                                {headers.map((header, index) => (
                                  <Draggable key={header} draggableId={header} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="p-2 bg-white rounded shadow cursor-move max-w-[80px] truncate text-sm"
                                      >
                                        {header}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        <div className="w-[100px]">
                          <h4 className="font-medium mb-2">Arithmetic Operators</h4>
                          <Droppable droppableId="arithmetic-operators" isDropDisabled={true}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="p-2 bg-gray-100 rounded space-y-2 min-h-[100px]"
                              >
                                {arithmeticOperators.map((op, index) => (
                                  <Draggable key={op} draggableId={op} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="p-2 bg-white rounded shadow cursor-move max-w-[80px] truncate text-sm text-center"
                                      >
                                        {op}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        <div className="w-[100px]">
                          <h4 className="font-medium mb-2">Logical Operators</h4>
                          <Droppable droppableId="logical-operators" isDropDisabled={true}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="p-2 bg-gray-100 rounded space-y-2 min-h-[100px]"
                              >
                                {logicalOperators.map((op, index) => (
                                  <Draggable key={op} draggableId={op} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="p-2 bg-white rounded shadow cursor-move max-w-[80px] truncate text-sm"
                                      >
                                        {op}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        <div className="w-[100px]">
                          <h4 className="font-medium mb-2">Comparison Operators</h4>
                          <Droppable droppableId="comparison-operators" isDropDisabled={true}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="p-2 bg-gray-100 rounded space-y-2 min-h-[100px]"
                              >
                                {comparisonOperators.map((op, index) => (
                                  <Draggable key={op} draggableId={op} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="p-2 bg-white rounded shadow cursor-move max-w-[80px] truncate text-sm text-center"
                                      >
                                        {op}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        <div className="w-[100px]">
                          <h4 className="font-medium mb-2">Integer Input</h4>
                          <Droppable droppableId="integer-input" isDropDisabled={true}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="p-2 bg-gray-100 rounded space-y-2 min-h-[100px]"
                              >
                                <Draggable key="integer" draggableId="integer" index={0}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="p-2 bg-white rounded shadow cursor-move max-w-[80px] truncate text-sm text-center"
                                    >
                                      Integer
                                    </div>
                                  )}
                                </Draggable>
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                        <div className="flex-[3] min-w-[300px]">
                          <h4 className="font-medium mb-2">Formula</h4>
                          <Droppable droppableId="formula">
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="formula-container p-2 bg-gray-100 rounded min-h-[100px] flex flex-row gap-2 justify-start items-center flex-nowrap"
                                style={{ direction: 'ltr', flexDirection: 'row', justifyContent: 'flex-start', flexWrap: 'nowrap' }}
                              >
                                {ruleForm.formula.map((item, index) => {
                                  console.log(`Rendering formula item at index ${index}: ${item} (Formula: ${ruleForm.formula.join(' ')})`);
                                  return (
                                    <Draggable
                                      key={`formula-${item}-${index}`}
                                      draggableId={`formula-${item}-${index}`}
                                      index={index}
                                    >
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className="p-2 bg-white rounded shadow flex items-center gap-2 max-w-[80px] truncate text-sm"
                                          style={{ order: index, display: 'inline-flex' }}
                                        >
                                          {item}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFormulaItem(index)}
                                            className="text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      </div>
                    </DragDropContext>
                    <Dialog open={integerDialogOpen} onOpenChange={setIntegerDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Enter Integer Value</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            type="number"
                            placeholder="Enter an integer"
                            value={integerValue}
                            onChange={(e) => setIntegerValue(e.target.value)}
                          />
                          <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleIntegerSubmit}
                          >
                            Submit
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      onClick={handleAddOrUpdateRule}
                      className="bg-blue-600 hover:bg-blue-700 text-white mt-4"
                    >
                      {editRule ? 'Update Rule' : 'Add Rule'}
                    </Button>
                    {fromRoute === 'rule-configurations' && step === '2' && navigatedTemplateId && (
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white mt-4 ml-4"
                        onClick={() => {
                          console.log(`Navigating back to /validate/${navigatedTemplateId}?step=2&from=rule-configurations`);
                          navigate(`/validate/${navigatedTemplateId}?step=2&from=rule-configurations`);
                        }}
                      >
                        Finish
                      </Button>
                    )}
                    <Table className="mt-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <input
                              type="checkbox"
                              checked={rules.length > 0 && rules.every((rule) => checkedRules[rule.rule_id])}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCheckedRules(rules.reduce((acc, rule) => ({ ...acc, [rule.rule_id]: checked }), {}));
                              }}
                            />
                          </TableHead>
                          <TableHead>Rule Name</TableHead>
                          <TableHead>Column</TableHead>
                          <TableHead>Formula</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rules.map((rule) => (
                          <TableRow key={rule.rule_id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={checkedRules[rule.rule_id] || false}
                                onChange={(e) => {
                                  setCheckedRules((prev) => ({ ...prev, [rule.rule_id]: e.target.checked }));
                                }}
                              />
                            </TableCell>
                            <TableCell>{rule.rule_name}</TableCell>
                            <TableCell>{rule.column_name}</TableCell>
                            <TableCell>{rule.parameters || 'No formula defined'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" onClick={() => handleEditRule(rule)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => handleDeleteRule(rule.rule_id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md mt-6">
            <CardHeader>
              <CardTitle>Basic Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Parameters</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['Required', 'Int', 'Float', 'Text', 'Email', 'Date', 'Boolean', 'Alphanumeric'].map((rule) => (
                    <TableRow key={rule}>
                      <TableCell>{rule}</TableCell>
                      <TableCell>
                        {rule === 'Required' ? 'Ensures the field is not null' :
                         rule === 'Int' ? 'Validates integer format' :
                         rule === 'Float' ? 'Validates number format (integer or decimal)' :
                         rule === 'Text' ? 'Allows text with quotes and parentheses' :
                         rule === 'Email' ? 'Validates email format' :
                         rule === 'Date' ? 'Validates date format' :
                         rule === 'Boolean' ? 'Validates boolean format (true/false or 0/1)' :
                         'Validates alphanumeric format'}
                      </TableCell>
                      <TableCell>{JSON.stringify({
                        format: rule.toLowerCase(),
                        allow_null: rule === 'Required' ? false : undefined,
                        regex: rule === 'Email' ? '^[a-zA-Z0-9_.+-]+@[a-zA.Z0-9-]+\.[a-zA.Z0-9-.]+$' : undefined
                      })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default RulesManagement;