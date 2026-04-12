export default function Dashboard(): JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Kontrol Paneli</h1>
        <p className="text-neutral-600 mt-2">
          Finansal sağlığınızı takip edin ve yönetin
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-neutral-600 text-sm font-medium">Finansal Skor</div>
          <div className="text-4xl font-bold text-primary-600">--</div>
          <div className="text-neutral-500 text-sm">Yükleniyor...</div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-neutral-600 text-sm font-medium">Toplam Gelir</div>
          <div className="text-4xl font-bold text-success-600">₺ --</div>
          <div className="text-neutral-500 text-sm">Yükleniyor...</div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="text-neutral-600 text-sm font-medium">Toplam Borç</div>
          <div className="text-4xl font-bold text-error-600">₺ --</div>
          <div className="text-neutral-500 text-sm">Yükleniyor...</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Son İşlemler</h2>
          <div className="text-center py-8 text-neutral-500">
            İşlem verileri yükleniyor...
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Yaklaşan Ödemeler</h2>
          <div className="text-center py-8 text-neutral-500">
            Ödeme verileri yükleniyor...
          </div>
        </div>
      </div>
    </div>
  );
}
