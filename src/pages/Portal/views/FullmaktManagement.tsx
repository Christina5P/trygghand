
// src/pages/Portal/views/FullmaktManagement.tsx

import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Loader2, FileText, Download, Upload, FileWarning, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FullmaktDocument {
    id: string;
    customer_id: string | null;
    file_name: string;
    storage_path: string;
    created_at: string;
    status?: string;
    fullmaktstyp?: string;
}

interface FullmaktManagementProps {
    customerId?: string;
    customerName?: string;
    onClose: () => void;
}

export const FullmaktManagement: React.FC<FullmaktManagementProps> = ({ 
    customerId, 
    customerName,
    onClose
}) => {
    const { toast } = useToast();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [documents, setDocuments] = useState<FullmaktDocument[]>([]);

    const fetchDocuments = async () => {
        setLoadingDocuments(true);
        try {
            let query = supabase
                .from('fullmakter')
                .select('id, fullmaktsgivare, file_name, storage_path, created_at, fullmakthavare, fullmaktstyp, status');

            if (customerId) {
                query = query.or(`fullmaktsgivare.eq.${customerId},fullmakthavare.eq.${customerId}`);
            } else {
                query = query.is('fullmaktsgivare', null).is('fullmakthavare', null); 
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            
            const mappedData: FullmaktDocument[] = data ? data.map((doc: any) => ({
                id: doc.id,
                customer_id: doc.fullmaktsgivare,
                file_name: doc.file_name,
                storage_path: doc.storage_path || doc.dokument_url,
                created_at: doc.created_at,
                status: doc.status,
                fullmaktstyp: doc.fullmaktstyp
            })) : [];

            setDocuments(mappedData);
        } catch (error) {
            console.error("Kunde inte hämta dokument:", error);
            toast({ title: "Fel vid hämtning", description: "Kunde inte ladda listan över fullmakter.", variant: "destructive" });
            setDocuments([]);
        } finally {
            setLoadingDocuments(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadFullmakt = async () => {
        if (!selectedFile) {
            toast({ title: "Varning", description: "Välj en fil att ladda upp.", variant: "default" });
            return;
        }

        setUploading(true);
        const fileExtension = selectedFile.name.split('.').pop();
        
                const { data, error } = await supabase.auth.getUser();
                if (error || !data.user) {
                    console.error("Failed to get user", error);
                    toast({ title: "Inloggning krävs", description: "Kunde inte hämta användare.", variant: "destructive" });
                    return;
                }
                const currentUser = data.user;
                const uploaderId = currentUser.id; // kopplad till auth.users (FK)
        
                // Använd auth-user-id som ägare i storage-sökvägen
                const pathPrefix = `fullmakter/${uploaderId}`;
        
        const safeFileName = selectedFile.name.replace(/[^a-z0-9.]/gi, '_');
        const uniqueFileName = `${safeFileName}_${Date.now()}.${fileExtension}`;
        const storagePath = `${pathPrefix}/${uniqueFileName}`; 

        try {
            const { error: uploadError } = await supabase.storage
                .from('fullmakts-filer')
                .upload(storagePath, selectedFile, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase
                .from('fullmakter')
                .insert({
                    fullmaktsgivare: uploaderId, // FK mot auth.users
                    fullmakthavare: customerId || uploaderId, // fallback
                    fullmaktstyp: 'Allmän fullmakt', 
                    status: 'Aktiv', 
                    dokument_url: storagePath, 
                    file_name: selectedFile.name,
                    storage_path: storagePath,
                });

            if (dbError) throw dbError;

            toast({ title: "Uppladdning klar", description: `Fullmakt '${selectedFile.name}' har sparats.`, variant: "default" });
            setSelectedFile(null);
            fetchDocuments();
            
        } catch (err) {
            console.error("Uppladdning/DB-fel:", err);
            toast({ title: "Fel vid uppladdning", description: "Kunde inte ladda upp filen eller spara referens.", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (document: FullmaktDocument) => {
        try {
            const { data, error } = await supabase.storage
                .from('fullmakts-filer') 
                .createSignedUrl(document.storage_path, 60);

            if (error) throw error;

            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            } else {
                throw new Error("Kunde inte generera en giltig nedladdningslänk.");
            }

        } catch (error) {
            console.error("Nedladdning misslyckades:", error);
            toast({ title: "Fel vid nedladdning", description: "Kunde inte ladda ner filen.", variant: "destructive" });
        }
    };

    const handleTemplateDownload = () => {
        toast({ title: "Mall Nedladdad", description: "Generell fullmaktsmall (PDF) har laddats ner.", variant: "default" });
    };

    useEffect(() => {
        fetchDocuments();
    }, [customerId]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Fullmaktshantering</h2>
                    <p className="text-muted-foreground">
                        {customerName ? `Hantera fullmakter för ${customerName}` : "Hantera mallar och arkiverade fullmakter"}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list">Dokument</TabsTrigger>
                    <TabsTrigger value="upload">Ladda upp & Mallar</TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="space-y-4 mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Arkiv</CardTitle>
                            <CardDescription>Lista över alla registrerade fullmakter och dokument.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingDocuments ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : documents.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                                    <FileWarning className="h-12 w-12 mb-2 opacity-20" />
                                    <p>Inga fullmakter hittades.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {documents.map((doc) => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="bg-primary/10 p-2 rounded-md">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{doc.file_name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{format(new Date(doc.created_at), "d MMM yyyy", { locale: sv })}</span>
                                                        {doc.status && (
                                                            <Badge variant="outline" className="h-5 text-[10px] px-1">{doc.status}</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => handleDownload(doc)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Download className="h-4 w-4" />
                                                <span className="sr-only">Ladda ner</span>
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="upload" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Ladda upp ny fullmakt</CardTitle>
                                <CardDescription>Ladda upp signerade dokument här.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Input 
                                        type="file" 
                                        onChange={handleFileChange} 
                                        accept=".pdf,.doc,.docx,.jpg,.png" 
                                        className="cursor-pointer"
                                    />
                                </div>
                                <Button 
                                    onClick={handleUploadFullmakt} 
                                    disabled={!selectedFile || uploading} 
                                    className="w-full"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                            Laddar upp...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" /> 
                                            Ladda upp dokument
                                        </>
                                    )}
                                </Button>
                                {selectedFile && (
                                    <p className="text-sm text-muted-foreground text-center">
                                        Vald fil: <span className="font-medium text-foreground">{selectedFile.name}</span>
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Fullmaktsmallar</CardTitle>
                                <CardDescription>Ladda ner mallar för att skriva ut och signera.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button variant="outline" className="w-full justify-between" onClick={handleTemplateDownload}>
                                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Allmän Fullmakt (PDF)</span>
                                    <Download className="h-4 w-4 opacity-50" />
                                </Button>
                                <Button variant="outline" className="w-full justify-between" onClick={handleTemplateDownload}>
                                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Framtidsfullmakt (PDF)</span>
                                    <Download className="h-4 w-4 opacity-50" />
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
export default FullmaktManagement;