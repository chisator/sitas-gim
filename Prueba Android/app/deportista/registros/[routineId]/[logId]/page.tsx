

import ClientPage from "./client";

export const dynamicParams = false;

export async function generateStaticParams() {
    return [{ routineId: 'dummy', logId: 'dummy' }];
}

export default function Page({ params }: { params: { routineId: string; logId: string } }) {
    return <ClientPage params={params} />;
}
