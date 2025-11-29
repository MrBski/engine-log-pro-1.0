"use client";

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { getInitialData, type InventoryItem, type InventoryCategory } from '@/lib/data';
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

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required."),
  category: z.enum(['main-engine', 'generator', 'other']),
  stock: z.coerce.number().min(0, "Stock can't be negative."),
  unit: z.string().min(1, "Unit is required."),
  lowStockThreshold: z.coerce.number().min(0, "Threshold can't be negative."),
});

const useItemSchema = z.object({
  amount: z.coerce.number().min(1, "Must use at least 1."),
});

export default function InventoryPage() {
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>('inventory', getInitialData().inventory);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [itemToUse, setItemToUse] = useState<InventoryItem | null>(null);
  const { toast } = useToast();

  const addForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: "", category: 'other', stock: 0, unit: "pcs", lowStockThreshold: 1 },
  });

  const useFormInstance = useForm<z.infer<typeof useItemSchema>>({
    resolver: zodResolver(useItemSchema),
    defaultValues: { amount: 1 },
  });

  const handleAddItem = (values: z.infer<typeof itemSchema>) => {
    const newItem: InventoryItem = { id: `item-${Date.now()}`, ...values };
    setInventory(prev => [...prev, newItem]);
    toast({ title: "Success", description: `${newItem.name} added to inventory.` });
    addForm.reset();
    setIsAddDialogOpen(false);
  };

  const handleUseItem = (values: z.infer<typeof useItemSchema>) => {
    if (!itemToUse) return;
    if(values.amount > itemToUse.stock) {
        useFormInstance.setError("amount", { type: "manual", message: "Not enough stock." });
        return;
    }
    setInventory(prev => prev.map(item => item.id === itemToUse.id ? { ...item, stock: item.stock - values.amount } : item));
    toast({ title: "Success", description: `${values.amount} ${itemToUse.unit} of ${itemToUse.name} used.` });
    setItemToUse(null);
    useFormInstance.reset();
  };

  const categories: InventoryCategory[] = ['main-engine', 'generator', 'other'];

  const renderTable = (category: InventoryCategory) => {
    const items = inventory.filter(item => item.category === category);
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <Badge variant={item.stock <= item.lowStockThreshold ? 'destructive' : 'secondary'}>
                  {item.stock} {item.unit}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => setItemToUse(item)}>Use</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Manage all parts and supplies.</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button></DialogTrigger>
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
      
      {/* Use Item Dialog */}
      <Dialog open={!!itemToUse} onOpenChange={(open) => !open && setItemToUse(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Use: {itemToUse?.name}</DialogTitle>
                <DialogDescription>Current stock: {itemToUse?.stock} {itemToUse?.unit}</DialogDescription>
            </DialogHeader>
            <Form {...useFormInstance}><form onSubmit={useFormInstance.handleSubmit(handleUseItem)} className="space-y-4">
                <FormField control={useFormInstance.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Amount to use</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setItemToUse(null)}>Cancel</Button>
                    <Button type="submit">Confirm Usage</Button>
                </DialogFooter>
            </form></Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
