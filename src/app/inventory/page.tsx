
"use client";

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { type InventoryItem, type InventoryCategory, type ActivityLog } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/app-header';
import { useData } from '@/hooks/use-data';

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required."),
  category: z.enum(['main-engine', 'generator', 'other']),
  stock: z.coerce.number().min(0, "Stock can't be negative."),
  unit: z.string().min(1, "Unit is required."),
  lowStockThreshold: z.coerce.number().min(0, "Threshold can't be negative."),
});

const useItemSchema = z.object({
  itemId: z.string().min(1, "Please select an item to use."),
  amount: z.coerce.number().min(1, "Must use at least 1."),
});

export default function InventoryPage() {
  const { inventory, setInventory, addActivityLog } = useData();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUseDialogOpen, setIsUseDialogOpen] = useState(false);
  const { toast } = useToast();

  const addForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", category: 'other', stock: 0, unit: "pcs", lowStockThreshold: 1 },
  });

  const useFormInstance = useForm<z.infer<typeof useItemSchema>>({
    resolver: zodResolver(useItemSchema),
    defaultValues: { itemId: "", amount: 1 },
  });

  const handleAddItem = (values: z.infer<typeof itemSchema>) => {
    const newItem: InventoryItem = { id: `item-${Date.now()}`, ...values };
    setInventory(prev => [...prev, newItem]);
    
    const newActivity: ActivityLog = {
      id: `activity-${Date.now()}`,
      type: 'inventory',
      timestamp: new Date().toISOString(),
      name: newItem.name,
      notes: `Added ${newItem.stock} ${newItem.unit} to stock.`,
      category: newItem.category,
    };
    addActivityLog(newActivity);

    toast({ title: "Success", description: `${newItem.name} added to inventory.` });
    addForm.reset();
    setIsAddDialogOpen(false);
  };

  const handleUseItem = (values: z.infer<typeof useItemSchema>) => {
    const itemToUse = inventory.find(item => item.id === values.itemId);
    if (!itemToUse) {
      useFormInstance.setError("itemId", { type: "manual", message: "Item not found." });
      return;
    }
    if(values.amount > itemToUse.stock) {
        useFormInstance.setError("amount", { type: "manual", message: "Not enough stock." });
        return;
    }
    setInventory(prev => prev.map(item => item.id === itemToUse.id ? { ...item, stock: item.stock - values.amount } : item));
    
    const newActivity: ActivityLog = {
      id: `activity-${Date.now()}`,
      type: 'inventory',
      timestamp: new Date().toISOString(),
      name: itemToUse.name,
      notes: `Used ${values.amount} ${itemToUse.unit}.`,
      category: itemToUse.category,
    };
    addActivityLog(newActivity);
    
    toast({ title: "Success", description: `${values.amount} ${itemToUse.unit} of ${itemToUse.name} used.` });
    useFormInstance.reset();
    setIsUseDialogOpen(false);
  };

  const categories: InventoryCategory[] = ['main-engine', 'generator', 'other'];

  const renderTable = (category: InventoryCategory) => {
    const items = inventory.filter(item => item.category === category);
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Stock</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell className="p-2 font-medium">{item.name}</TableCell>
              <TableCell className="p-2 text-right">
                <Badge variant={item.stock <= item.lowStockThreshold ? 'destructive' : 'secondary'}>
                  {item.stock} {item.unit}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const selectedItemForUsage = useFormInstance.watch("itemId");
  const selectedItemDetails = inventory.find(item => item.id === selectedItemForUsage);


  return (
    <>
      <AppHeader />
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Manage all parts and supplies.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isUseDialogOpen} onOpenChange={setIsUseDialogOpen}>
              <DialogTrigger asChild><Button variant="outline"><Icons.minus className="mr-2 h-4 w-4" /> Use Item</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                    <DialogTitle>Use Inventory Item</DialogTitle>
                    <DialogDescription>Select an item and specify the amount used.</DialogDescription>
                </DialogHeader>
                <Form {...useFormInstance}><form onSubmit={useFormInstance.handleSubmit(handleUseItem)} className="space-y-4">
                  <FormField control={useFormInstance.control} name="itemId" render={({ field }) => (
                    <FormItem><FormLabel>Item</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an item to use" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {inventory.map(item => (
                              <SelectItem key={item.id} value={item.id}>{item.name} (Stock: {item.stock})</SelectItem>
                            ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {selectedItemDetails && (
                    <FormField control={useFormInstance.control} name="amount" render={({ field }) => (
                        <FormItem><FormLabel>Amount to use ({selectedItemDetails.unit})</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  )}
                  <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                      <Button type="submit">Confirm Usage</Button>
                  </DialogFooter>
                </form></Form>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild><Button><Icons.plus className="mr-2 h-4 w-4" /> Add Item</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Inventory Item</DialogTitle></DialogHeader>
                <Form {...addForm}><form onSubmit={addForm.handleSubmit(handleAddItem)} className="space-y-4">
                  <FormField control={addForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Item Name</FormLabel><FormControl><Input placeholder="e.g. Lube Oil Filter" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={addForm.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="main-engine">Main Engine</SelectItem><SelectItem value="generator">Generator</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={addForm.control} name="stock" render={({ field }) => (<FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={addForm.control} name="unit" render={({ field }) => (<FormItem><FormLabel>Unit</FormLabel><FormControl><Input placeholder="pcs" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={addForm.control} name="lowStockThreshold" render={({ field }) => (<FormItem><FormLabel>Threshold</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <DialogFooter><DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose><Button type="submit">Add Item</Button></DialogFooter>
                </form></Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="main-engine">
            <TabsList>
              <TabsTrigger value="main-engine">Main Engine</TabsTrigger>
              <TabsTrigger value="generator">Generator</TabsTrigger>
              <TabsTrigger value="other">Others</TabsTrigger>
            </TabsList>
            {categories.map(cat => (
              <TabsContent key={cat} value={cat}>{renderTable(cat)}</TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
