import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LogActivityPage() {
    return (
        <div className="flex flex-col gap-6">
            <AppHeader />
            <Card>
                <CardHeader>
                    <CardTitle>Log Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Log activity will be displayed here.</p>
                </CardContent>
            </Card>
        </div>
    )
}
