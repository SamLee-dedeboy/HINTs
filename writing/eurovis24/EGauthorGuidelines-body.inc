% ---------------------------------------------------------------------
% EG author guidelines plus sample file for EG publication using LaTeX2e input
% D.Fellner, v2.04, Sep 19, 2023


% \title[EG \LaTeX\ Author Guidelines]%
%       {\LaTeX\ Author Guidelines for EUROGRAPHICS Proceedings Manuscripts}
\title{HyperMap: Sensemaking of Text Corpora using Hypergraphs}

% for anonymous conference submission please enter your SUBMISSION ID
% instead of the author's name (and leave the affiliation blank) !!
% for final version: please provide your *own* ORCID in the brackets following \orcid; see https://orcid.org/ for more details.
\author{submission ID}
% \author[D. Fellner \& S. Behnke]
% {\parbox{\textwidth}{\centering D.\,W. Fellner\thanks{Chairman Eurographics Publications Board}$^{1,2}$\orcid{0000-0001-7756-0901}
%         and S. Behnke$^{2}$\orcid{0000-0001-5923-423X} 
% %        S. Spencer$^2$\thanks{Chairman Siggraph Publications Board}
%         }
%         \\
% % For Computer Graphics Forum: Please use the abbreviation of your first name.
% {\parbox{\textwidth}{\centering $^1$TU Darmstadt \& Fraunhofer IGD, Germany\\
%          $^2$Graz University of Technology, Institute of Computer Graphics and Knowledge Visualization, Austria
% %        $^2$ Another Department to illustrate the use in papers from authors
% %             with different affiliations
%        }
% }
% }
% ------------------------------------------------------------------------

% if the Editors-in-Chief have given you the data, you may uncomment
% the following five lines and insert it here
%
% \volume{36}   % the volume in which the issue will be published;
% \issue{1}     % the issue number of the publication
% \pStartPage{1}      % set starting page


%-------------------------------------------------------------------------
\begin{document}

% uncomment for using teaser
% \teaser{
%  \includegraphics[width=0.9\linewidth]{eg_new}
%  \centering
%   \caption{New EG Logo}
% \label{fig:teaser}
%}
\teaser{
  \centering
  \includegraphics[height=8cm, keepaspectratio]{teaser}
  \caption{The HyperMap system. 
  (a) The peripheral area of Cluster View shows the mentioned keywords of highlighted documents using Gilbert curves.
  (b) The center area of Cluster View shows the topic structure of the corpus using Gosper curves.
  (c) The Document View shows a list of selected documents.
  (d) The Chatbot View provides a chatbot interface to answer user questions with the option to insert selected documents in the prompt.}
\label{fig: sfc}
}


\maketitle
%-------------------------------------------------------------------------
\begin{abstract}
   The ABSTRACT is to be in fully-justified italicized text, 
   between two horizontal lines,
   in one-column format, 
   below the author and affiliation information. 
   Use the word ``Abstract'' as the title, in 9-point Times, boldface type, 
   left-aligned to the text, initially capitalized. 
   The abstract is to be in 9-point, single-spaced type.
   The abstract may be up to 3 inches (7.62 cm) long. \\
   Leave one blank line after the abstract, 
   then add the subject categories according to the ACM Classification Index 
%-------------------------------------------------------------------------
%  ACM CCS 1998
%  (see https://www.acm.org/publications/computing-classification-system/1998)
% \begin{classification} % according to https://www.acm.org/publications/computing-classification-system/1998
% \CCScat{Computer Graphics}{I.3.3}{Picture/Image Generation}{Line and curve generation}
% \end{classification}
%-------------------------------------------------------------------------
%  ACM CCS 2012
   (see https://www.acm.org/publications/class-2012)
%The tool at \url{http://dl.acm.org/ccs.cfm} can be used to generate
% CCS codes.
%Example:
\begin{CCSXML}
<ccs2012>
<concept>
<concept_id>10010147.10010371.10010352.10010381</concept_id>
<concept_desc>Computing methodologies~Collision detection</concept_desc>
<concept_significance>300</concept_significance>
</concept>
<concept>
<concept_id>10010583.10010588.10010559</concept_id>
<concept_desc>Hardware~Sensors and actuators</concept_desc>
<concept_significance>300</concept_significance>
</concept>
<concept>
<concept_id>10010583.10010584.10010587</concept_id>
<concept_desc>Hardware~PCB design and layout</concept_desc>
<concept_significance>100</concept_significance>
</concept>
</ccs2012>
\end{CCSXML}

\ccsdesc[300]{Computing methodologies~Collision detection}
\ccsdesc[300]{Hardware~Sensors and actuators}
\ccsdesc[100]{Hardware~PCB design and layout}


\printccsdesc   
\end{abstract}  
%-------------------------------------------------------------------------
\input{sections/01_Introduction.tex}
\input{sections/02_Related_Works.tex}
\input{sections/03_Design_Rationale.tex}
\input{sections/04_Methodology.tex}
\input{sections/05_Visualization.tex}
\input{sections/06_System_Design.tex}
\input{sections/07_Usage_Scenario.tex}
\input{sections/08_User_Study.tex}
\input{sections/09_Limitations_and_Future_Work.tex}
\input{sections/10_Conclusion.tex}
%-------------------------------------------------------------------------
% bibtex
\bibliographystyle{eg-alpha-doi} 
\bibliography{egbibsample}       

% biblatex with biber
% \printbibliography                

%-------------------------------------------------------------------------
%Color tables are no longer required for purely electronic publications.
% \newpage
% 
% 
% \begin{figure*}[tbp]
%   \centering
%   \mbox{} \hfill
%   % the following command controls the width of the embedded PS file
%   % (relative to the width of the current column)
%   \includegraphics[width=.3\linewidth]{sampleFig}
%   % replacing the above command with the one below will explicitly set
%   % the bounding box of the PS figure to the rectangle (xl,yl),(xh,yh).
%   % It will also prevent LaTeX from reading the PS file to determine
%   % the bounding box (i.e., it will speed up the compilation process)
%   % \includegraphics[width=.3\linewidth, bb=39 696 126 756]{sampleFig}
%   \hfill
%   \includegraphics[width=.3\linewidth]{sampleFig}
%   \hfill \mbox{}
%   \caption{\label{fig:ex3}%
%            For publications with color tables (i.e., publications not offering
%            color throughout the paper) please \textbf{observe}: 
%            for the printed version -- and ONLY for the printed
%            version -- color figures have to be placed in the last page.
%            \newline
%            For the electronic version, which will be converted to PDF before
%            making it available electronically, the color images should be
%            embedded within the document. Optionally, other multimedia
%            material may be attached to the electronic version. }
% \end{figure*}

\end{document}
