"use client";

import { InboundForm } from "@/components/inbound-form";
import { InboundHistoryPage } from "@/components/inbound-history";

export default function InboundClientDispatcher({ 
  profile, expeditions, products, currentStock, productHomes, warehouseId, clusterConfigs, clusterOverrides, historyData, users
}: any) {
  
  if (profile.role === "admin_cabang") {
    return (
      <InboundHistoryPage 
        userProfile={profile} 
        historyData={historyData} 
        products={products}
        expeditions={expeditions}
        users={users}
      />
    );
  }

  return (
    <InboundForm 
      userProfile={profile} 
      expeditions={expeditions}
      products={products}
      currentStock={currentStock}
      productHomes={productHomes}
      warehouseId={warehouseId}
      clusterConfigs={clusterConfigs}
      clusterOverrides={clusterOverrides}
      todayInboundHistory={historyData}
      users={users}
    />
  );
}