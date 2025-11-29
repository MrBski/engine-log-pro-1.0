
"use client";

import { useState } from 'react';
import { type LogSection, type Reading } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
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
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useData } from '@/hooks/use-data';

const readingSchema = z.object({
  key: z.string().min(1, 'Reading name is required'),
  unit: z.string().min(1, 'Unit is required'),
});

const sectionSchema = z.object({
  title: z.string().min(1, 'Section title is required'),
});

export default function LogbookSettingsPage() {
  const { logbookSections, setLogbookSections } = useData();
  const { toast } = useToast();
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const sectionForm = useForm<z.infer<typeof sectionSchema>>({ resolver: zodResolver(sectionSchema) });
  const readingForm = useForm<z.infer<typeof readingSchema>>({ resolver: zodResolver(readingSchema) });
  const sectionTitleForm = useForm<z.infer<typeof sectionSchema>>({ resolver: zodResolver(sectionSchema) });
  
  const handleAddSection = (values: z.infer<typeof sectionSchema>) => {
    const newSection: LogSection = {
      id: `section-${Date.now()}`,
      title: values.title,
      readings: [],
    };
    setLogbookSections(prev => [...prev, newSection]);
    sectionForm.reset({ title: '' });
    toast({ title: 'Section Added', description: `"${values.title}" has been added.` });
  };

  const handleRemoveSection = (sectionId: string) => {
    setLogbookSections(prev => prev.filter(s => s.id !== sectionId));
    toast({ title: 'Section Removed' });
  };
  
  const handleEditSectionTitle = (sectionId: string, newTitle: string) => {
    setLogbookSections(prev => prev.map(s => s.id === sectionId ? { ...s, title: newTitle } : s));
    setEditingSectionId(null);
    toast({ title: 'Section Updated' });
  };


  const handleAddReading = (sectionId: string, values: z.infer<typeof readingSchema>) => {
    const newReading: Reading = {
      id: `reading-${Date.now()}`,
      key: values.key,
      unit: values.unit,
    };
    setLogbookSections(prev => prev.map(s => s.id === sectionId ? { ...s, readings: [...s.readings, newReading] } : s));
    readingForm.reset({ key: '', unit: '' });
    toast({ title: 'Reading Added', description: `"${values.key}" has been added.` });
  };

  const handleRemoveReading = (sectionId: string, readingId: string) => {
    setLogbookSections(prev => prev.map(s => {
      if (s.id === sectionId) {
        return { ...s, readings: s.readings.filter(r => r.id !== readingId) };
      }
      return s;
    }));
    toast({ title: 'Reading Removed' });
  };


  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/settings"><Icons.arrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
            <h1 className="text-2xl font-bold">Customize Logbook</h1>
            <p className="text-muted-foreground">Add, remove, and reorder sections and fields.</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Logbook Sections</CardTitle>
          <CardDescription>Manage the sections that appear on your log sheet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logbookSections.map(section => (
            <Card key={section.id} className="p-4 space-y-4">
               <div className="flex items-center justify-between">
                {editingSectionId === section.id ? (
                   <Form {...sectionTitleForm}>
                     <form
                       onSubmit={sectionTitleForm.handleSubmit(values => handleEditSectionTitle(section.id, values.title))}
                       className="flex items-center gap-2 flex-grow"
                     >
                       <FormField
                         control={sectionTitleForm.control}
                         name="title"
                         defaultValue={section.title}
                         render={({ field }) => (
                           <FormItem className="flex-grow">
                             <FormControl><Input {...field} /></FormControl>
                           </FormItem>
                         )}
                       />
                       <Button type="submit" size="icon"><Icons.save className="h-4 w-4" /></Button>
                       <Button type="button" variant="ghost" size="icon" onClick={() => setEditingSectionId(null)}><Icons.close className="h-4 w-4" /></Button>
                     </form>
                   </Form>
                ) : (
                    <div className="flex items-center gap-2">
                        <Icons.grip className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-lg">{section.title}</h3>
                        <Button variant="ghost" size="icon" onClick={() => setEditingSectionId(section.id)}><Icons.edit className="h-4 w-4" /></Button>
                    </div>
                )}
                <Button variant="destructive" size="sm" onClick={() => handleRemoveSection(section.id)}>
                  <Icons.trash className="mr-2 h-4 w-4" /> Remove Section
                </Button>
              </div>

              <div className="pl-6 border-l-2 ml-2 space-y-2">
                {section.readings.map(reading => (
                  <div key={reading.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <p className="text-sm font-medium">{reading.key} <span className="text-muted-foreground">({reading.unit})</span></p>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveReading(section.id, reading.id)}>
                      <Icons.trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Icons.plus className="mr-2 h-4 w-4" /> Add Reading
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Reading to "{section.title}"</DialogTitle>
                      <DialogDescription>Define a new field to be recorded in this section.</DialogDescription>
                    </DialogHeader>
                    <Form {...readingForm}>
                      <form onSubmit={readingForm.handleSubmit((values) => handleAddReading(section.id, values))} className="space-y-4">
                        <FormField
                          control={readingForm.control}
                          name="key"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reading Name</FormLabel>
                              <FormControl><Input placeholder="e.g. L.O. Pressure" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={readingForm.control}
                          name="unit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <FormControl><Input placeholder="e.g. bar, °C, rpm" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button type="submit">Add Reading</Button></DialogClose>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ))}

          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Icons.plus className="mr-2 h-4 w-4" /> Add New Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Logbook Section</DialogTitle>
                <DialogDescription>Create a new category for your engine readings.</DialogDescription>
              </DialogHeader>
              <Form {...sectionForm}>
                <form onSubmit={sectionForm.handleSubmit(handleAddSection)} className="space-y-4">
                  <FormField
                    control={sectionForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section Title</FormLabel>
                        <FormControl><Input placeholder="e.g. Generator No. 2" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild><Button type="submit">Add Section</Button></DialogClose>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
