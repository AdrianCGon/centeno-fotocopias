import { useState, useEffect } from "react";
import type { Route } from "./+types/solicitar-fotocopias";
import { buildApiUrl, API_CONFIG } from "../config/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Centeno Fotocopias - Solicita tu servicio" },
    { name: "description", content: "Solicita servicios de fotocopiado, impresión y encuadernación. Cálculo automático de páginas y costos." },
  ];
}

interface FormData {
  nombreApellido: string;
  telefono: string;
  email: string;
  textoNecesario: string;
  costoImpresion: number;
  costoLibros: number;
  costoTotal: number;
  montoAbonar: number;
  recibirInformacion: boolean;
}

interface FileInfo {
  file: File | null;
  name: string;
  size: number;
  pages?: number;
  analyzing?: boolean;
}

interface AlertState {
  show: boolean;
  type: 'success' | 'danger' | 'info';
  message: string;
}

export default function SolicitarFotocopias() {
  // Verificar conectividad con el backend al cargar el componente
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        // Usar el endpoint público de health check
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.HEALTH), {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        
        if (response.ok) {
          // Servidor funcionando correctamente
        } else {
          setAlert({
            show: true,
            type: 'danger',
            message: 'El servidor no está disponible. Contacta al administrador.'
          });
        }
      } catch (error) {
        setAlert({
          show: true,
          type: 'danger',
          message: 'No se puede conectar con el servidor. Verifica que esté funcionando.'
        });
      }
    };
    
    checkBackendConnection();
  }, []);
  const [formData, setFormData] = useState<FormData>({
    nombreApellido: "",
    telefono: "",
    email: "",
    textoNecesario: "",
    costoImpresion: 0,
    costoLibros: 0,
    costoTotal: 0,
    montoAbonar: 0,
    recibirInformacion: false,
  });

  // Calcular automáticamente los costos cuando cambian las páginas
  const calculateCosts = () => {
    const pages1 = files.materialImprimir1File.pages && files.materialImprimir1File.pages > 0 ? files.materialImprimir1File.pages : 0;
    const pages2 = files.materialImprimir2File.pages && files.materialImprimir2File.pages > 0 ? files.materialImprimir2File.pages : 0;
    const pages3 = files.materialImprimir3File.pages && files.materialImprimir3File.pages > 0 ? files.materialImprimir3File.pages : 0;
    
    const totalPages = pages1 + pages2 + pages3;
    const costoImpresion = totalPages * 40; // 40 pesos por página
    const costoTotal = costoImpresion + formData.costoLibros;
    const montoAbonar = Math.round(costoTotal * 0.5); // 50% del total
    
    return { costoImpresion, costoTotal, montoAbonar, totalPages };
  };
  
  const [files, setFiles] = useState<{
    materialImprimir1File: FileInfo;
    materialImprimir2File: FileInfo;
    materialImprimir3File: FileInfo;
    comprobanteFile: FileInfo;
  }>({
    materialImprimir1File: { file: null, name: '', size: 0, pages: 0, analyzing: false },
    materialImprimir2File: { file: null, name: '', size: 0, pages: 0, analyzing: false },
    materialImprimir3File: { file: null, name: '', size: 0, pages: 0, analyzing: false },
    comprobanteFile: { file: null, name: '', size: 0, pages: 0, analyzing: false },
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertState>({
    show: false,
    type: 'success',
    message: ''
  });

  // Estado para libros disponibles y seleccionados
  const [libros, setLibros] = useState<Array<{id: string, titulo: string, precio: number}>>([]);
  const [librosSeleccionados, setLibrosSeleccionados] = useState<string[]>([]);

  // Recalcular costos automáticamente cuando cambien las páginas o los libros
  useEffect(() => {
    const { costoImpresion, costoTotal, montoAbonar } = calculateCosts();
    console.log('🧮 Recalculando costos:', { costoImpresion, costoTotal, montoAbonar, costoLibros: formData.costoLibros });
    setFormData(prev => ({
      ...prev,
      costoImpresion,
      costoTotal,
      montoAbonar
    }));
  }, [files.materialImprimir1File.pages, files.materialImprimir2File.pages, files.materialImprimir3File.pages, formData.costoLibros]);

  // Cargar libros disponibles al montar el componente
  useEffect(() => {
    const fetchLibros = async () => {
      try {
                  const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.LIBROS.PUBLIC));
        if (response.ok) {
          const data = await response.json();
          setLibros(data.data || []);
        }
      } catch (error) {
        console.error('Error cargando libros:', error);
      }
    };
    
    fetchLibros();
  }, []);

  // Calcular costo de libros cuando cambien los seleccionados
  useEffect(() => {
    const costoLibros = libros
      .filter(libro => librosSeleccionados.includes(libro.id))
      .reduce((total, libro) => total + (libro.precio || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      costoLibros
    }));
  }, [librosSeleccionados, libros]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Para checkboxes, usar 'checked', para otros campos usar 'value'
    const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                      type === 'number' ? parseFloat(value) || 0 : value;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: finalValue
      };
      
      // Calcular costos automáticamente
      if (name.includes('Pages') || name.includes('costo')) {
        const costoImpresion = name === 'costoImpresion' ? parseFloat(value) || 0 : prev.costoImpresion;
        const costoLibros = name === 'costoLibros' ? parseFloat(value) || 0 : prev.costoLibros;
        const costoTotal = costoImpresion + costoLibros;
        
        return {
          ...newData,
          costoImpresion,
          costoLibros,
          costoTotal,
          montoAbonar: Math.round(costoTotal * 0.5)
        };
      }
      
      return newData;
    });
  };

  const handleLibroSelection = (libroId: string, checked: boolean) => {
    console.log('📚 Seleccionando libro:', { libroId, checked });
    if (checked) {
      setLibrosSeleccionados(prev => [...prev, libroId]);
    } else {
      setLibrosSeleccionados(prev => prev.filter(id => id !== libroId));
    }
  };

  const analyzePdf = async (file: File): Promise<number> => {
    try {
      // Convertir el archivo a ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Importar pdf-lib dinámicamente
      const { PDFDocument } = await import('pdf-lib');
      
      // Cargar el PDF
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Obtener el número de páginas
      const pages = pdfDoc.getPageCount() || 0;
      
      if (pages === 0) {
        setAlert({
          show: true,
          type: 'danger',
          message: 'No se pudo contar las páginas del PDF. Verifica que el archivo no esté dañado.'
        });
      }
      
      return pages;
    } catch (error) {
      console.error('Error al analizar PDF:', error);
      setAlert({
        show: true,
        type: 'danger',
        message: 'Error al analizar el PDF. Verifica que el archivo no esté dañado.'
      });
      return 0;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo según el campo
      if (fieldName === 'comprobanteFile') {
        // Para comprobante, permitir PDF, JPG, PNG
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
          setAlert({
            show: true,
            type: 'danger',
            message: 'Solo se permiten archivos PDF, JPG o PNG para el comprobante'
          });
          e.target.value = '';
          return;
        }
      } else {
        // Para materiales, solo PDF
        if (file.type !== 'application/pdf') {
          setAlert({
            show: true,
            type: 'danger',
            message: 'Solo se permiten archivos PDF para los materiales'
          });
          e.target.value = '';
          return;
        }
      }
      
      // Sin restricción de tamaño de archivo

      // Establecer archivo
      setFiles(prev => ({
        ...prev,
        [fieldName]: {
          file: file,
          name: file.name,
          size: file.size,
          pages: 0,
          analyzing: fieldName !== 'comprobanteFile' // Solo analizar PDFs
        }
      }));

      // Analizar PDF para contar páginas (solo para materiales)
      if (fieldName !== 'comprobanteFile') {
        const pages = await analyzePdf(file);
        
        // Actualizar con el número de páginas
        setFiles(prev => ({
          ...prev,
          [fieldName]: {
            file: file,
            name: file.name,
            size: file.size,
            pages: pages,
            analyzing: false
          }
        }));
      }

    } else {
      setFiles(prev => ({
        ...prev,
        [fieldName]: { file: null, name: '', size: 0, pages: 0, analyzing: false }
      }));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlert({ show: false, type: 'success', message: '' });

    // Validar que el comprobante esté presente
    if (!files.comprobanteFile.file) {
      setAlert({
        show: true,
        type: 'danger',
        message: '⚠️ El comprobante de pago es obligatorio para enviar la solicitud.'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Verificar si hay archivos para determinar qué ruta usar
      // NOTA: El comprobante de pago es obligatorio, por lo que siempre habría archivos
      // Por eso siempre usaríamos la ruta principal con multipart/form-data
      // 
      // SOLUCIÓN COMPLETA: Usar la ruta correcta según el contenido
      // - Si hay archivos de material: ruta principal (multipart)
      // - Si solo hay comprobante: ruta sin archivos (JSON)
      // 
      // ESTO EVITA el error "Unexpected end of form" porque:
      // 1. Solo enviamos multipart cuando realmente hay archivos de material
      // 2. Para solo libros usamos JSON (más confiable)
      // 3. El comprobante se puede enviar por cualquiera de las dos rutas
      const hasMaterialFiles = files.materialImprimir1File.file || 
                              files.materialImprimir2File.file || 
                              files.materialImprimir3File.file;

      console.log('🔍 DEBUG - Estado de archivos:');
      console.log('  - materialImprimir1File:', !!files.materialImprimir1File.file);
      console.log('  - materialImprimir2File:', !!files.materialImprimir2File.file);
      console.log('  - materialImprimir3File:', !!files.materialImprimir3File.file);
      console.log('  - comprobanteFile:', !!files.comprobanteFile.file);
      console.log('  - hasMaterialFiles:', hasMaterialFiles);

      let response;
      
      if (hasMaterialFiles) {
        // Si hay archivos de material, usar la ruta principal con multipart/form-data
        console.log('📁 Enviando solicitud CON archivos de material (multipart)');
        
        setAlert({
          show: true,
          type: 'info',
          message: '📁 Enviando solicitud con archivos de material y libros...'
        });
        
        // Crear FormData para enviar archivos
        const submitFormData = new FormData();
        
        // Agregar campos del formulario
        Object.entries(formData).forEach(([key, value]) => {
          if (key === 'recibirInformacion') {
            submitFormData.append(key, value.toString());
          } else {
            submitFormData.append(key, value.toString());
          }
        });

        // Debug: Ver qué se está enviando
        console.log('📋 DEBUG - Datos del formulario a enviar:', formData);
        console.log('📋 DEBUG - Libros seleccionados:', librosSeleccionados);
        
        // Agregar libros seleccionados
        if (librosSeleccionados.length > 0) {
          submitFormData.append('librosSeleccionados', JSON.stringify(librosSeleccionados));
        }
        
        // Agregar archivos de material
        if (files.materialImprimir1File.file) {
          submitFormData.append('materialImprimir1File', files.materialImprimir1File.file);
        }
        if (files.materialImprimir2File.file) {
          submitFormData.append('materialImprimir2File', files.materialImprimir2File.file);
        }
        if (files.materialImprimir3File.file) {
          submitFormData.append('materialImprimir3File', files.materialImprimir3File.file);
        }
        
        // Agregar comprobante (siempre obligatorio)
        if (files.comprobanteFile.file) {
          submitFormData.append('comprobanteFile', files.comprobanteFile.file);
        }

        // Debug: Ver el contenido del FormData
        console.log('📋 DEBUG - Contenido del FormData:');
        for (let [key, value] of submitFormData.entries()) {
          console.log(`  - ${key}:`, value);
        }

        // Debug: Verificar que los campos obligatorios estén presentes
        console.log('🔍 DEBUG - Verificación de campos obligatorios:');
        console.log('  - nombreApellido presente:', submitFormData.has('nombreApellido'));
        console.log('  - telefono presente:', submitFormData.has('telefono'));
        console.log('  - textoNecesario presente:', submitFormData.has('textoNecesario'));
        console.log('  - comprobanteFile presente:', submitFormData.has('comprobanteFile'));

        response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.SOLICITUDES.BASE + '/busboy'), {
          method: 'POST',
          body: submitFormData,
        });
        console.log('🌐 DEBUG - Enviando a ruta busboy (multipart):', buildApiUrl(API_CONFIG.ENDPOINTS.SOLICITUDES.BASE + '/busboy'));
      } else {
        // Si no hay archivos de material, usar la ruta sin archivos con JSON
        console.log('📚 Enviando solicitud SOLO con libros (JSON)');
        
        setAlert({
          show: true,
          type: 'info',
          message: '📚 Enviando solicitud solo con libros...'
        });
        
        const solicitudData = {
          ...formData,
          // recibirInformacion ya es un boolean correcto
          librosSeleccionados: librosSeleccionados.length > 0 ? JSON.stringify(librosSeleccionados) : '[]'
        };

        response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.SOLICITUDES.BASE + '/sin-archivos'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(solicitudData)
        });
        
        console.log('🌐 DEBUG - Enviando a ruta sin archivos (JSON):', buildApiUrl(API_CONFIG.ENDPOINTS.SOLICITUDES.BASE + '/sin-archivos'));
      }

      const result = await response.json();

      if (response.ok) {
        const numeroPedido = result.data?.numeroPedido || 'N/A';
        
        setAlert({
          show: true,
          type: 'success',
          message: `¡Perfecto! Tu solicitud ha sido enviada exitosamente como Pedido #${numeroPedido}. Te contactaremos pronto con el presupuesto.`
        });
        // Reset form
        setFiles({
          materialImprimir1File: { file: null, name: '', size: 0, pages: 0, analyzing: false },
          materialImprimir2File: { file: null, name: '', size: 0, pages: 0, analyzing: false },
          materialImprimir3File: { file: null, name: '', size: 0, pages: 0, analyzing: false },
          comprobanteFile: { file: null, name: '', size: 0, pages: 0, analyzing: false },
        });
        setFormData({
          nombreApellido: "",
          telefono: "",
          email: "",
          textoNecesario: "",
          costoImpresion: 0,
          costoLibros: 0,
          costoTotal: 0,
          montoAbonar: 0,
          recibirInformacion: false,
        });
        setLibrosSeleccionados([]);
      } else {
        setAlert({
          show: true,
          type: 'danger',
          message: result.message || 'Hubo un error al enviar tu solicitud. Por favor, inténtalo de nuevo.'
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        type: 'danger',
        message: 'Error de conexión. Por favor, verifica que el servidor esté funcionando.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <header className="text-white py-5" style={{backgroundColor: '#FD8200'}}>
        <div className="container text-center">
          <h1 className="display-4 mb-3">
            <i className="fas fa-print me-3"></i>
            Centeno Fotocopias
          </h1>
          <p className="lead mb-0">Impresiones al costo</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container my-5">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            {/* Page Title */}
   

            {/* Alert */}
            {alert.show && (
              <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert">
                {alert.message}
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setAlert({ ...alert, show: false })}
                  aria-label="Close"
                ></button>
              </div>
            )}

            {/* Form */}
            <div className="card shadow-lg">
              <div className="card-header text-white" style={{backgroundColor: '#FD8200'}}>
                <h3 className="card-title mb-0">
                  <i className="fas fa-file-alt me-2"></i>
                  Formulario de Solicitud
                </h3>
              </div>
              <div className="card-body p-4">
                <form onSubmit={handleSubmit}>
                  {/* Información Personal */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h4 className="border-bottom pb-2 mb-3" style={{color: '#FD8200'}}>
                        <i className="fas fa-user me-2"></i>
                        Información Personal
                      </h4>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="form-outline">
                        <input
                          type="text"
                          className="form-control"
                          id="nombreApellido"
                          name="nombreApellido"
                          value={formData.nombreApellido}
                          onChange={handleInputChange}
                          required
                          placeholder=" "
                        />
                        <label className="form-label" htmlFor="nombreApellido">
                          Nombre y Apellido *
                        </label>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="form-outline">
                        <input
                          type="tel"
                          className="form-control"
                          id="telefono"
                          name="telefono"
                          value={formData.telefono}
                          onChange={handleInputChange}
                          required
                          placeholder=" "
                        />
                        <label className="form-label" htmlFor="telefono">
                          Teléfono *
                        </label>
                      </div>
                    </div>
                    <div className="col-md-12 mb-3">
                      <div className="form-outline">
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder=" "
                        />
                        <label className="form-label" htmlFor="email">
                          Email
                        </label>
                      </div>
                    </div>
                  </div>

                  

                  {/* Material a Imprimir */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h4 className="border-bottom pb-2 mb-3" style={{color: '#FD8200'}}>
                        <i className="fas fa-files-o me-2"></i>
                        Material a Imprimir
                      </h4>
                    </div>
                    
                    {/* Material 1 */}
                    <div className="col-md-4 mb-3">
                      <div className="card">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <i className="fas fa-file-pdf-o me-1"></i>
                            Material 1
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="mb-2">
                            <label className="form-label">Subir Archivo PDF</label>
                            <input
                              type="file"
                              className="form-control"
                              accept=".pdf"
                              onChange={(e) => handleFileChange(e, 'materialImprimir1File')}
                            />
                            {files.materialImprimir1File.file && (
                              <div className="mt-2 p-2 bg-success bg-opacity-10 rounded">
                                <small className="text-success">
                                  <i className="fas fa-check-circle me-1"></i>
                                  <strong>{files.materialImprimir1File.name}</strong>
                                  <br />
                                  Tamaño: {formatFileSize(files.materialImprimir1File.size)}
                                  <br />
                                  {files.materialImprimir1File.analyzing ? (
                                    <span className="text-info">
                                      <div className="spinner-border spinner-border-sm me-2" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                      </div>
                                      Analizando páginas...
                                    </span>
                                  ) : (
                                    <span>
                                      <i className="fas fa-file-text-o me-1"></i>
                                      Páginas: {files.materialImprimir1File.pages || 0}
                                      {files.materialImprimir1File.pages > 0 && (
                                        <span className="text-success ms-2">
                                          <i className="fas fa-check-circle"></i>
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Material 2 */}
                    <div className="col-md-4 mb-3">
                      <div className="card">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <i className="fas fa-file-pdf-o me-1"></i>
                            Material 2
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="mb-2">
                            <label className="form-label">Subir Archivo PDF</label>
                            <input
                              type="file"
                              className="form-control"
                              accept=".pdf"
                              onChange={(e) => handleFileChange(e, 'materialImprimir2File')}
                            />
                            {files.materialImprimir2File.file && (
                              <div className="mt-2 p-2 bg-success bg-opacity-10 rounded">
                                <small className="text-success">
                                  <i className="fas fa-check-circle me-1"></i>
                                  <strong>{files.materialImprimir2File.name}</strong>
                                  <br />
                                  Tamaño: {formatFileSize(files.materialImprimir2File.size)}
                                  <br />
                                  {files.materialImprimir2File.analyzing ? (
                                    <span className="text-info">
                                      <div className="spinner-border spinner-border-sm me-2" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                      </div>
                                      Analizando páginas...
                                    </span>
                                  ) : (
                                    <span>
                                      <i className="fas fa-file-text-o me-1"></i>
                                      Páginas: {files.materialImprimir2File.pages || 0}
                                      {files.materialImprimir2File.pages > 0 && (
                                        <span className="text-success ms-2">
                                          <i className="fas fa-check-circle"></i>
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Material 3 */}
                    <div className="col-md-4 mb-3">
                      <div className="card">
                        <div className="card-header bg-light">
                          <h6 className="mb-0">
                            <i className="fas fa-file-pdf-o me-1"></i>
                            Material 3
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="mb-2">
                            <label className="form-label">Subir Archivo PDF</label>
                            <input
                              type="file"
                              className="form-control"
                              accept=".pdf"
                              onChange={(e) => handleFileChange(e, 'materialImprimir3File')}
                            />
                            {files.materialImprimir3File.file && (
                              <div className="mt-2 p-2 bg-success bg-opacity-10 rounded">
                                <small className="text-success">
                                  <i className="fas fa-check-circle me-1"></i>
                                  <strong>{files.materialImprimir3File.name}</strong>
                                  <br />
                                  Tamaño: {formatFileSize(files.materialImprimir3File.size)}
                                  <br />
                                  {files.materialImprimir3File.analyzing ? (
                                    <span className="text-info">
                                      <div className="spinner-border spinner-border-sm me-2" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                      </div>
                                      Analizando páginas...
                                    </span>
                                  ) : (
                                    <span>
                                      <i className="fas fa-file-text-o me-1"></i>
                                      Páginas: {files.materialImprimir3File.pages || 0}
                                      {files.materialImprimir3File.pages > 0 && (
                                        <span className="text-success ms-2">
                                          <i className="fas fa-check-circle"></i>
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aclaraciones debajo de archivos */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="form-outline">
                        <textarea
                          className="form-control"
                          id="textoNecesario"
                          name="textoNecesario"
                          rows={3}
                          value={formData.textoNecesario}
                          onChange={handleInputChange}
                          required
                          placeholder=" "
                        />
                        <label className="form-label" htmlFor="textoNecesario">
                          ¿Alguna aclaración que quieras realizar?
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Selección de Libros */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h4 className="border-bottom pb-2 mb-3" style={{color: '#FD8200'}}>
                        <i className="fas fa-book me-2"></i>
                        Libros Disponibles
                      </h4>
                      <div className="row">
                        {libros.map(libro => (
                          <div key={libro.id} className="col-md-6 col-lg-4 mb-3">
                            <div className="card h-100">
                              <div className="card-body">
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`libro-${libro.id}`}
                                    checked={librosSeleccionados.includes(libro.id)}
                                    onChange={(e) => handleLibroSelection(libro.id, e.target.checked)}
                                  />
                                  <label className="form-check-label" htmlFor={`libro-${libro.id}`}>
                                    <strong>{libro.titulo}</strong>
                                    <br />
                                    <small className="text-muted">${libro.precio?.toLocaleString() || '0'}</small>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recibir Información */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="recibirInformacion"
                          name="recibirInformacion"
                          checked={formData.recibirInformacion}
                          onChange={handleInputChange}
                        />
                        <label className="form-check-label" htmlFor="recibirInformacion">
                          ¿Querés recibir más información de la Centeno?
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Comprobante de Pago */}
                  <div className="row mb-4">
                    <div className="col-12">
                      <h4 className="border-bottom pb-2 mb-3" style={{color: '#FD8200'}}>
                        <i className="fas fa-credit-card me-2"></i>
                        Comprobante de Pago
                      </h4>
                      <div className="card">
                        <div className="card-body">
                          <div className="mb-3">
                            <label className="form-label">
                              Subir Comprobante (PDF, JPG, PNG) 
                              <span className="text-danger ms-1">*</span>
                            </label>
                            <input
                              type="file"
                              className="form-control"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileChange(e, 'comprobanteFile')}
                              required
                            />
                            {files.comprobanteFile.file && (
                              <div className="mt-2 p-2 bg-success bg-opacity-10 rounded">
                                <small className="text-success">
                                  <strong>{files.comprobanteFile.name}</strong>
                                  <br />
                                  Tamaño: {formatFileSize(files.comprobanteFile.size)}
                                  <span className="text-success ms-2">
                                    <i className="fas fa-check-circle"></i>
                                  </span>
                                </small>
                              </div>
                            )}
                          </div>
                          <small className="text-muted">
                            <span className="text-danger fw-bold">⚠️ OBLIGATORIO:</span> Adjunta el comprobante de transferencia del 50% del total ({formData.montoAbonar > 0 ? `$${formData.montoAbonar.toLocaleString()}` : '$0'}) ALIAS: impresionescenteno25
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  

                  {/* Resumen de Costos */}
                  {(calculateCosts().totalPages > 0 || formData.costoLibros > 0) && (
                    <div className="row">
                      <div className="col-12">
                        <div className="card bg-light" style={{borderColor: '#FD8200'}}>
                          <div className="card-header text-white" style={{backgroundColor: '#FD8200'}}>
                            <h5 className="mb-0">
                              <i className="fas fa-calculator me-2"></i>
                              Resumen de Costos
                            </h5>
                          </div>
                          <div className="card-body">
                            <div className="row">
                              <div className="col-md-6">
                                {/* Solo mostrar páginas si hay archivos */}
                                {calculateCosts().totalPages > 0 && (
                                  <>
                                    {files.materialImprimir1File.pages && files.materialImprimir1File.pages > 0 && (
                                      <div className="d-flex justify-content-between mb-2">
                                        <span>📄 Material 1:</span>
                                        <span className="fw-bold">{files.materialImprimir1File.pages} páginas</span>
                                      </div>
                                    )}
                                    {files.materialImprimir2File.pages && files.materialImprimir2File.pages > 0 && (
                                      <div className="d-flex justify-content-between mb-2">
                                        <span>📄 Material 2:</span>
                                        <span className="fw-bold">{files.materialImprimir2File.pages} páginas</span>
                                      </div>
                                    )}
                                    {files.materialImprimir3File.pages && files.materialImprimir3File.pages > 0 && (
                                      <div className="d-flex justify-content-between mb-2">
                                        <span>📄 Material 3:</span>
                                        <span className="fw-bold">{files.materialImprimir3File.pages} páginas</span>
                                      </div>
                                    )}
                                    <hr />
                                    <div className="d-flex justify-content-between mb-2">
                                      <span className="fw-bold">Total páginas:</span>
                                      <span className="fw-bold" style={{color: '#FD8200'}}>{calculateCosts().totalPages} páginas</span>
                                    </div>
                                  </>
                                )}
                                
                                {/* Mostrar libros seleccionados si los hay */}
                                {librosSeleccionados.length > 0 && (
                                  <>
                                    <div className="d-flex justify-content-between mb-2">
                                      <span>📚 Libros seleccionados:</span>
                                      <span className="fw-bold">{librosSeleccionados.length} libro(s)</span>
                                    </div>
                                    <hr />
                                  </>
                                )}
                              </div>
                              <div className="col-md-6">
                                {/* Mostrar precio por página solo si hay archivos */}
                                {calculateCosts().totalPages > 0 && (
                                  <div className="d-flex justify-content-between mb-2">
                                    <span>Precio por página:</span>
                                    <span className="fw-bold">$40</span>
                                  </div>
                                )}
                                
                                {/* Mostrar costo de impresión solo si hay páginas */}
                                {formData.costoImpresion > 0 && (
                                  <div className="d-flex justify-content-between mb-2">
                                    <span>Costo impresión:</span>
                                    <span className="fw-bold">${formData.costoImpresion.toLocaleString()}</span>
                                  </div>
                                )}
                                
                                {/* Mostrar costo de libros si los hay */}
                                {formData.costoLibros > 0 && (
                                  <div className="d-flex justify-content-between mb-2">
                                    <span>Costo libros:</span>
                                    <span className="fw-bold">${formData.costoLibros.toLocaleString()}</span>
                                  </div>
                                )}
                                
                                <hr />
                                <div className="d-flex justify-content-between mb-2">
                                  <span className="fw-bold text-success">Total a abonar:</span>
                                  <span className="fw-bold text-success fs-5">${formData.costoTotal.toLocaleString()}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                  <span className="fw-bold text-info">Transferir (50%):</span>
                                  <span className="fw-bold text-info fs-5">${formData.montoAbonar.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botón Submit */}
                  <div className="d-grid gap-2">
                    <button
                      type="submit"
                      className="btn btn-lg ripple"
                      disabled={isSubmitting}
                      data-mdb-ripple-color="light"
                      style={{backgroundColor: '#FD8200', borderColor: '#FD8200'}}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Enviando solicitud...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane me-2"></i>
                          Enviar Solicitud
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-dark text-white py-4 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h5>Centeno Fotocopias</h5>
               
            </div>
            <div className="col-md-6 text-md-end">
              <p className="mb-0">© 2025 Centeno Fotocopias. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}